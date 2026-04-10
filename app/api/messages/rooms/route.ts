import { getCachedUserRooms } from '@/lib/services/messages';
import { revalidateTag } from 'next/cache';
import { getUserTag } from '@/lib/cache-keys';

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
            revalidateTag(getUserTag(dbUser.id));

            return NextResponse.json({ room });
        }

        return NextResponse.json({ error: 'Action not supported' }, { status: 400 });
    } catch (e) {
        return handleApiError(e);
    }
}
