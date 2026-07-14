import { getCachedUserRooms } from '@/lib/services/messages';
import { revalidateTag } from 'next/cache';
import { getUserTag } from '@/lib/cache-keys';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSchoolLinked, handleApiError } from '@/lib/security';
import { syncGroupMemberships, getOrCreatePrivateRoom } from '@/lib/messaging';

export async function GET(request: Request) {
    try {
        const dbUser = await requireSchoolLinked();

        // Auto-sync memberships on login/access
        await syncGroupMemberships(dbUser.id, dbUser.schoolId, dbUser.role);

        // Fetch using the optimized cached service
        const rooms = await getCachedUserRooms(dbUser.id, dbUser.schoolId!, dbUser.role);

        return NextResponse.json({ rooms });
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
            
            // Invalidate Inbox Cache
            revalidateTag(getUserTag(dbUser.id), 'max');

            
        // Audit log
        try {
            const { logActivity } = await import('@/lib/audit');
            const _ip = request instanceof Request ? (request.headers.get('x-forwarded-for') || request.headers.get('cf-connecting-ip') || undefined) : undefined;
            const _userId = (typeof user !== 'undefined' && user?.id) ? user.id : undefined;
            if (_userId) {
                await logActivity({ userId: _userId, action: 'CREATE', resourceType: 'message', ip: _ip || undefined });
            }
        } catch { /* non-blocking */ }
return NextResponse.json({ room });
        }

        return NextResponse.json({ error: 'Action not supported' }, { status: 400 });
    } catch (e) {
        return handleApiError(e);
    }
}
