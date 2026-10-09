import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createClient } from '@/utils/supabase/server';
import { canUserAccessChatRoom } from '@/lib/messaging';

export async function PATCH(request: Request) {
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();

    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { chatRoomId }: any = await request.json().catch(() => ({}));

        if (!chatRoomId) return NextResponse.json({ error: 'Missing chatRoomId' }, { status: 400 });

        const room = await prisma.chatRoom.findUnique({
            where: { id: chatRoomId },
            include: { members: { select: { userId: true } } }
        });

        if (!room) {
            return NextResponse.json({ error: 'Room not found' }, { status: 404 });
        }

        const dbUser = await prisma.user.findUnique({
            where: { id: authUser.id },
            select: { id: true, schoolId: true, role: true }
        });

        if (!dbUser) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const hasAccess = await canUserAccessChatRoom(dbUser.id, dbUser.schoolId || '', dbUser.role, room);
        if (!hasAccess) {
            return NextResponse.json({ error: 'Forbidden: You are not authorized to access this room' }, { status: 403 });
        }

        await prisma.chatRoomMember.upsert({
            where: {
                chatRoomId_userId: { chatRoomId, userId: authUser.id }
            },
            update: {
                lastReadAt: new Date()
            },
            create: {
                chatRoomId,
                userId: authUser.id,
                lastReadAt: new Date()
            }
        });

        
        // Audit log
        try {
            const { logActivity } = await import('@/lib/audit');
            const _ip = request?.headers?.get('x-forwarded-for')?.split(',')[0]?.trim() || request?.headers?.get('cf-connecting-ip') || undefined;
            const _userId = authUser?.id ?? undefined;
            if (_userId) {
                await logActivity({ userId: _userId, action: 'UPDATE', resourceType: 'message', ip: _ip || undefined });
            }
        } catch { /* non-blocking */ }
return NextResponse.json({ success: true });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
