import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, handleApiError } from '@/lib/security';
import { logActivity } from '@/lib/audit';
import { canUserAccessChatRoom } from '@/lib/messaging';

export async function POST(request: Request) {
    try {
        const dbUser = await requireAuth();

        const { chatRoomId }: any = await request.json().catch(() => ({}));

        if (!chatRoomId) {
            return NextResponse.json({ error: 'Chat Room ID is required' }, { status: 400 });
        }

        const room = await prisma.chatRoom.findUnique({
            where: { id: chatRoomId },
            include: { members: true }
        });

        if (!room) {
            return NextResponse.json({ error: 'Chat Room not found' }, { status: 404 });
        }

        // Verify channel and tenant access
        const hasAccess = await canUserAccessChatRoom(dbUser.id, dbUser.schoolId || '', dbUser.role, room);
        if (!hasAccess) {
            return NextResponse.json({ error: 'Forbidden: You are not authorized to access this room' }, { status: 403 });
        }

        // Channel guard: students and parents cannot nuke institutional channels
        const isStaff = ['OWNER', 'PRINCIPAL', 'TEACHER', 'HOMEROOM', 'SUPERADMIN'].includes(dbUser.role);
        if (room.type !== 'PRIVATE' && !isStaff) {
            return NextResponse.json({ error: 'Only staff members can clear group channels' }, { status: 403 });
        }

        // Atomically delete all messages in the room and bump room updatedAt
        await prisma.$transaction(async (tx) => {
            await tx.message.deleteMany({
                where: { chatRoomId }
            });

            await tx.chatRoom.update({
                where: { id: chatRoomId },
                data: { updatedAt: new Date() }
            });
        });

        const ip = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || undefined;
        await logActivity({
            userId: dbUser.id,
            schoolId: room.schoolId,
            action: 'CLEAR_MESSAGES',
            resourceType: 'MESSAGE',
            resourceId: chatRoomId,
            ip,
            after: { chatRoomId, clearedAt: new Date().toISOString() }
        });

        return NextResponse.json({ success: true });
    } catch (e) {
        return handleApiError(e);
    }
}
