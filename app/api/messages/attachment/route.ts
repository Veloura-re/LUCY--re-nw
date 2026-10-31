import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSchoolLinked, handleApiError } from '@/lib/security';
import { canUserAccessChatRoom } from '@/lib/messaging';
import { createAdminClient } from '@/utils/supabase/admin';

/** Upload names are generated server-side: timestamp, short id, sanitized stem and extension. */
const SAFE_FILE = /^[A-Za-z0-9._-]{1,200}$/;

/** Sends an authorized room member to a short-lived signed URL for a private chat attachment. */
export async function GET(request: Request) {
    try {
        const dbUser = await requireSchoolLinked();
        const { searchParams } = new URL(request.url);
        const roomId = searchParams.get('room');
        const file = searchParams.get('file');

        if (!roomId || !file || !SAFE_FILE.test(file) || file.includes('..')) {
            return NextResponse.json({ error: 'Invalid attachment reference' }, { status: 400 });
        }

        const room = await prisma.chatRoom.findUnique({
            where: { id: roomId },
            include: { members: { select: { userId: true } } }
        });
        if (!room || !(await canUserAccessChatRoom(dbUser.id, dbUser.schoolId, dbUser.role, room))) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        const { data, error } = await createAdminClient().storage
            .from('messages')
            .createSignedUrl(`${roomId}/${file}`, 60);
        if (error || !data?.signedUrl) {
            return NextResponse.json({ error: 'Attachment not found' }, { status: 404 });
        }

        return NextResponse.redirect(data.signedUrl, 302);
    } catch (e) {
        return handleApiError(e);
    }
}
