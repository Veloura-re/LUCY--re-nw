import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createClient } from '@/utils/supabase/server';

export async function PATCH(request: Request) {
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();

    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { chatRoomId } = await request.json();

        if (!chatRoomId) return NextResponse.json({ error: 'Missing chatRoomId' }, { status: 400 });

        await prisma.chatRoomMember.update({
            where: {
                chatRoomId_userId: { chatRoomId, userId: authUser.id }
            },
            data: {
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
