import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { syncGroupMemberships, getOrCreatePrivateRoom } from '@/lib/messaging';
import { ChatRoomType } from '@prisma/client';
import { requireSchoolLinked, handleApiError } from '@/lib/security';

export async function GET(request: Request) {
    try {
        const dbUser = await requireSchoolLinked();

        // Auto-sync memberships on login/access
        await syncGroupMemberships(dbUser.id, dbUser.schoolId, dbUser.role);

        // Fetch all rooms the user is a member of
        const rooms = await prisma.chatRoom.findMany({
            where: {
                schoolId: dbUser.schoolId,
                members: { some: { userId: dbUser.id } }
            },
            include: {
                members: {
                    include: {
                        user: {
                            select: { id: true, name: true, role: true, bio: true }
                        }
                    }
                },
                messages: {
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                    include: {
                        fromUser: { select: { name: true } }
                    }
                }
            },
            orderBy: { updatedAt: 'desc' }
        });

        // Consolidate unread counts for all rooms in a single query
        const membershipMap = new Map<string, Date>();
        rooms.forEach((room: any) => {
            const myMembership = room.members.find((m: any) => m.userId === dbUser.id);
            if (myMembership?.lastReadAt) {
                membershipMap.set(room.id, myMembership.lastReadAt);
            }
        });

        // Get all unread message counts in a single grouped query
        const unreadGroups = await prisma.message.groupBy({
            by: ['chatRoomId'],
            where: {
                chatRoomId: { in: rooms.map((r: any) => r.id) }
            },
            _count: { id: true }
        });

        // Build a map of per-room total message counts
        const totalCountMap = new Map(unreadGroups.map(g => [g.chatRoomId, g._count.id]));

        // For "since lastReadAt" we need per-room filtering. Use a targeted multi-filter approach.
        const unreadCountPerRoom = new Map<string, number>();
        for (const [roomId, lastReadAt] of membershipMap.entries()) {
            const count = await prisma.message.count({
                where: { chatRoomId: roomId, createdAt: { gt: lastReadAt } }
            });
            unreadCountPerRoom.set(roomId, count);
        }

        // Format rooms with metadata
        const roomsWithMeta = await Promise.all(rooms.map(async (room: any) => {
            const unreadCount = unreadCountPerRoom.get(room.id) ?? 0;

            // For private chats, identify the 'partner'
            let partner = null;
            if (room.type === ChatRoomType.PRIVATE) {
                const partnerMember = room.members.find((m: any) => m.userId !== dbUser.id);
                partner = partnerMember?.user || null;

                // SPECIAL LOGIC: Rename PARENT if viewed by STAFF
                if (partner && partner.role === 'PARENT' && dbUser.role !== 'PARENT' && dbUser.role !== 'STUDENT') {
                    const children = await prisma.parentStudentLink.findMany({
                        where: { parentId: partner.id },
                        include: { student: true }
                    });
                    if (children.length > 0) {
                        const childNames = children.map(c => c.student.firstName).join(', ');
                        partner = {
                            ...partner,
                            name: `${childNames}'s Parent (${partner.name})`
                        };
                    }
                }
            }

            return {
                ...room,
                unreadCount,
                partner
            };
        }));

        return NextResponse.json({ rooms: roomsWithMeta });
    } catch (e) {
        return handleApiError(e);
    }
}

export async function POST(request: Request) {
    try {
        const dbUser = await requireSchoolLinked();
        const { targetUserId } = await request.json();

        // Handle private chat creation
        if (targetUserId) {
            // Permission checks and Tenant Isolation checks
            const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
            if (!targetUser || targetUser.schoolId !== dbUser.schoolId) {
                return NextResponse.json({ error: 'Target user not found or forbidden' }, { status: 404 });
            }

            // Students cannot message other students
            if (dbUser.role === 'STUDENT' && targetUser.role === 'STUDENT') {
                return NextResponse.json({ error: 'thisis restricted on student mode' }, { status: 403 });
            }

            // Parents restrictions
            if (dbUser.role === 'PARENT') {
                if (targetUser.role === 'STUDENT') {
                    return NextResponse.json({ error: 'thisis restricted on parent mode' }, { status: 403 });
                }
                if (targetUser.role === 'PARENT') {
                    return NextResponse.json({ error: 'thisis restricted on parent mode' }, { status: 403 });
                }
            }

            const room = await getOrCreatePrivateRoom(dbUser.schoolId, dbUser.id, targetUserId);
            return NextResponse.json({ room });
        }

        return NextResponse.json({ error: 'Action not supported' }, { status: 400 });
    } catch (e) {
        return handleApiError(e);
    }
}
