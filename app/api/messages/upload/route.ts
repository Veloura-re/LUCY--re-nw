import { getVerifiedUser, handleApiError, clientDataError } from '@/lib/security';
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { prisma } from '@/lib/prisma';
import { canUserAccessChatRoom } from '@/lib/messaging';
import { rateLimitShared } from '@/lib/rate-limit';
import { logActivity } from '@/lib/audit';
import { validateUpload, MESSAGE_RULES } from '@/lib/upload-validation';

export async function POST(request: Request) {
    const limited = await rateLimitShared(request, 'messages/upload', 30);
    if (limited) return limited;

    const authUser = await getVerifiedUser();

    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const formData = await request.formData();
        const file = formData.get('file');
        const chatRoomId = formData.get('chatRoomId');

        if (!file || typeof chatRoomId !== 'string' || !chatRoomId) {
            return NextResponse.json({ error: 'Missing file or chatRoomId' }, { status: 400 });
        }

        const validation = await validateUpload(file, MESSAGE_RULES);
        if (!validation.ok) {
            return NextResponse.json({ error: validation.error }, { status: 400 });
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

        const originalName = (file as File).name.replace(/[^a-zA-Z0-9.]/g, '_').slice(0, 80);
        const fileName = `${Date.now()}-${crypto.randomUUID().substring(0, 8)}-${originalName.replace(/\.[^.]*$/, '')}.${validation.extension}`;
        const filePath = `${chatRoomId}/${fileName}`;

        // The bucket is private and has no client policies: access was authorized above, so the
        // service role writes the object and reads go through /api/messages/attachment.
        const { error } = await createAdminClient().storage
            .from('messages')
            .upload(filePath, file as File, {
                cacheControl: '3600',
                upsert: false,
                contentType: validation.mimeType
            });

        if (error) {
            console.error('Storage error:', error);
            return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
        }

        await logActivity({
            userId: dbUser.id,
            schoolId: dbUser.schoolId || undefined,
            action: 'UPLOAD',
            resourceType: 'message',
            resourceId: chatRoomId,
            ip: request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || undefined
        });
        return NextResponse.json({
            url: `/api/messages/attachment?room=${encodeURIComponent(chatRoomId)}&file=${encodeURIComponent(fileName)}`,
            name: (file as File).name,
            type: validation.mimeType,
            size: (file as File).size
        });
    } catch (e) {
        { const bad = clientDataError(e); if (bad) return bad; }
        if (/^(Unauthorized|Forbidden)/.test(String((e as any)?.message))) return handleApiError(e);
        console.error(e);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
