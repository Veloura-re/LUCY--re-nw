import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSchoolLinked, handleApiError, secureJson } from '@/lib/security';
import { getCachedRoomMessages } from '@/lib/services/messages';
import { ensureDbUser } from '@/lib/messaging';

export async function GET(request: Request) {
    try {
        const dbUser = await requireSchoolLinked();

        const { searchParams } = new URL(request.url);
        const chatRoomId = searchParams.get('chatRoomId');
        const cursor = searchParams.get('cursor') || undefined;
        const limit = parseInt(searchParams.get('limit') || '50');

        if (!chatRoomId) {
            return NextResponse.json({ error: 'Chat Room ID is required' }, { status: 400 });
        }

        // Verify room belongs to this school
        const room = await prisma.chatRoom.findUnique({
            where: { id: chatRoomId },
            select: { id: true, schoolId: true, type: true }
        });

        if (!room || (room.schoolId && dbUser.schoolId && room.schoolId !== dbUser.schoolId)) {
            return NextResponse.json({ error: 'Room not found or forbidden' }, { status: 404 });
        }

        // Ensure user is registered as member
        if (dbUser.id) {
            await prisma.chatRoomMember.upsert({
                where: { chatRoomId_userId: { chatRoomId, userId: dbUser.id } },
                update: { lastReadAt: new Date() },
                create: { chatRoomId, userId: dbUser.id }
            }).catch(() => {});
        }

        // Fetch using the optimized cached service
        const data = await getCachedRoomMessages(chatRoomId, cursor, limit);

        return secureJson(data);
    } catch (e) {
        return handleApiError(e);
    }
}

export async function POST(request: Request) {
    try {
        const dbUser = await requireSchoolLinked();
        const { chatRoomId, content, attachments } = await request.json();

        if (!chatRoomId || (!content && !attachments)) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Verify room belongs to this school
        const room = await prisma.chatRoom.findUnique({
            where: { id: chatRoomId }
        });

        if (!room || (room.schoolId && dbUser.schoolId && room.schoolId !== dbUser.schoolId)) {
            return NextResponse.json({ error: 'Forbidden: Room does not belong to your school' }, { status: 403 });
        }

        // Ensure user exists in prisma DB
        const ensuredUser = await ensureDbUser(dbUser.id, undefined, dbUser.role as any, dbUser.schoolId);
        const validUserId = ensuredUser?.id || dbUser.id;

        // Auto-join member to room
        await prisma.chatRoomMember.upsert({
            where: { chatRoomId_userId: { chatRoomId, userId: validUserId } },
            update: { lastReadAt: new Date() },
            create: { chatRoomId, userId: validUserId }
        }).catch(() => {});

        const message = await prisma.message.create({
            data: {
                chatRoomId,
                fromUserId: validUserId,
                schoolId: room.schoolId || dbUser.schoolId,
                content: content || '',
                attachments: attachments || null
            },
            include: {
                fromUser: {
                    select: { id: true, name: true, role: true }
                }
            }
        });

        // Update room's updatedAt for sorting
        await prisma.chatRoom.update({
            where: { id: chatRoomId },
            data: { updatedAt: new Date() }
        }).catch(() => {});

        return NextResponse.json({ message });
    } catch (e) {
        return handleApiError(e);
    }
}
