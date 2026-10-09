import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { prisma } from '@/lib/prisma';
import { canUserAccessChatRoom } from '@/lib/messaging';

export async function POST(request: Request) {
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();

    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const chatRoomId = formData.get('chatRoomId') as string;

        if (!file || !chatRoomId) {
            return NextResponse.json({ error: 'Missing file or chatRoomId' }, { status: 400 });
        }

        // Verify room and access authorization
        const room = await prisma.chatRoom.findUnique({
            where: { id: chatRoomId },
            include: { members: { select: { userId: true } } }
        });

        if (!room) {
            return NextResponse.json({ error: 'Chat room not found' }, { status: 404 });
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
            return NextResponse.json({ error: 'Forbidden: You are not authorized to upload to this channel' }, { status: 403 });
        }

        const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
        const filePath = `${chatRoomId}/${fileName}`;

        // Upload to Supabase Storage
        // NOTE: Ensure 'messages' bucket exists and is public or has appropriate policies
        const { data, error } = await supabase.storage
            .from('messages')
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: false
            });

        if (error) {
            console.error('Storage error:', error);
            if ((error as any).status === 404 || (error as any).message?.includes('not found')) {
                return NextResponse.json({
                    error: 'Storage Infrastructure Missing: Please create a public bucket named "messages" in your Supabase project to enable attachments.'
                }, { status: 404 });
            }
            return NextResponse.json({ error: 'Upload failed: ' + error.message }, { status: 500 });
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
            .from('messages')
            .getPublicUrl(filePath);

        
        // Audit log
        try {
            const { logActivity } = await import('@/lib/audit');
            const _ip = request?.headers?.get('x-forwarded-for')?.split(',')[0]?.trim() || request?.headers?.get('cf-connecting-ip') || undefined;
            const _userId = authUser?.id ?? undefined;
            if (_userId) {
                await logActivity({ userId: _userId, action: 'UPLOAD', resourceType: 'message', ip: _ip || undefined });
            }
        } catch { /* non-blocking */ }
return NextResponse.json({
            url: publicUrl,
            name: file.name,
            type: file.type,
            size: file.size
        });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
