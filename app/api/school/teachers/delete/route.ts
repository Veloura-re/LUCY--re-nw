import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole, handleApiError } from '@/lib/security';
import { logActivity } from '@/lib/audit';
import { revalidateTag } from 'next/cache';
import { CACHE_TAGS, getSchoolTag } from '@/lib/cache-keys';

export async function DELETE(request: Request) {
    try {
        const dbUser = await requireRole(['PRINCIPAL', 'SUPERADMIN']);

        const { email } = await request.json() as any;

        if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 });

        if (!dbUser.schoolId) return NextResponse.json({ error: 'No school linked' }, { status: 400 });

        // Try to delete invite first
        const deletedInvite = await prisma.inviteToken.deleteMany({
            where: {
                email: email,
                schoolId: dbUser.schoolId
            }
        });

        // If no invite found, check if it's an active user and unlink/delete them
        if (deletedInvite.count === 0) {
            const teacher = await prisma.user.findFirst({
                where: { email: email, schoolId: dbUser.schoolId }
            });

            if (teacher) {
                // Delete teacher assignments and timetables to free up tasks/classes
                await prisma.teacherAssignment.deleteMany({
                    where: { teacherId: teacher.id }
                });
                await prisma.timetable.deleteMany({
                    where: { teacherId: teacher.id }
                });

                await prisma.user.update({
                    where: { id: teacher.id },
                    data: { schoolId: null }
                });
            }
        }

        // Trigger Cache Invalidation for the personnel registry
        revalidateTag(getSchoolTag(CACHE_TAGS.USER_PROFILE, dbUser.schoolId), 'max');

        // Log Activity
        await logActivity({
            userId: dbUser.id,
            action: 'DELETE_STAFF_OR_INVITE',
            resourceType: 'USER/INVITE',
            resourceId: email,
            before: { email }
        });

        return NextResponse.json({ success: true });
    } catch (e) {
        return handleApiError(e);
    }
}
