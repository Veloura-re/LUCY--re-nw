import { rateLimitShared } from '@/lib/rate-limit';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSchoolLinked, handleApiError, secureJson } from '@/lib/security';
import { getCachedRoomMessages, invalidateRoomCache } from '@/lib/services/messages';
import { ensureDbUser, canUserAccessChatRoom } from '@/lib/messaging';

export async function GET(request: Request) {
    try {
        const dbUser = await requireSchoolLinked();

        const { searchParams } = new URL(request.url);
        const chatRoomId = searchParams.get('chatRoomId');
        const cursor = searchParams.get('cursor') || undefined;
        const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50') || 50));

        if (!chatRoomId) {
            return NextResponse.json({ error: 'Chat Room ID is required' }, { status: 400 });
        }

        // Verify room belongs to this school
        const room = await prisma.chatRoom.findUnique({
            where: { id: chatRoomId },
            include: {
                members: { select: { userId: true } }
            }
        });

        if (!room) {
            return NextResponse.json({ error: 'Room not found' }, { status: 404 });
        }

        // Enforce strict role and class cohort access boundaries
        const hasAccess = await canUserAccessChatRoom(dbUser.id, dbUser.schoolId, dbUser.role, room);
        if (!hasAccess) {
            return NextResponse.json({ error: 'Access denied: You are not authorized to view this room' }, { status: 403 });
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
        const limited = await rateLimitShared(request, 'messages/post', 60);
        if (limited) return limited;

        const dbUser = await requireSchoolLinked();
        const body = ((await request.json().catch(() => ({}))) || {}) as any;
        const { chatRoomId, attachments } = body;
        const content: string | undefined = typeof body.content === 'string' ? body.content : undefined;

        if (typeof chatRoomId !== 'string' || !chatRoomId || (!content && !attachments)) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }
        if (content && content.length > 4000) {
            return NextResponse.json({ error: 'Message is too long (maximum 4000 characters)' }, { status: 400 });
        }
        if (attachments !== undefined && attachments !== null && (!Array.isArray(attachments) || attachments.length > 10)) {
            return NextResponse.json({ error: 'Invalid attachments' }, { status: 400 });
        }

        // Verify room belongs to this school
        const room = await prisma.chatRoom.findUnique({
            where: { id: chatRoomId },
            include: {
                members: { select: { userId: true } }
            }
        });

        if (!room) {
            return NextResponse.json({ error: 'Room not found' }, { status: 404 });
        }

        // Enforce strict role and class cohort access boundaries
        const hasAccess = await canUserAccessChatRoom(dbUser.id, dbUser.schoolId, dbUser.role, room);
        if (!hasAccess) {
            return NextResponse.json({ error: 'Forbidden: You are not authorized to post in this room' }, { status: 403 });
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

        // Instant Redis/LRU cache invalidation for this room
        await invalidateRoomCache(chatRoomId).catch(() => {});

        return NextResponse.json({ message });
    } catch (e) {
        return handleApiError(e);
    }
}
