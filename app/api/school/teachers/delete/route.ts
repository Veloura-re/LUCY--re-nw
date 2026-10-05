import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole, handleApiError } from '@/lib/security';
import { logActivity } from '@/lib/audit';
import { revalidateTag } from 'next/cache';
import { CACHE_TAGS, getSchoolTag } from '@/lib/cache-keys';

export async function DELETE(request: Request) {
    try {
        const dbUser = await requireRole(['PRINCIPAL', 'OWNER', 'SUPERADMIN']);

        const { email } = await request.json() as any;

        if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 });

        if (!dbUser.schoolId) return NextResponse.json({ error: 'No school linked' }, { status: 400 });

        // 1. Delete all invite tokens for this email and school
        await prisma.inviteToken.deleteMany({
            where: {
                email: email,
                schoolId: dbUser.schoolId
            }
        });

        // 2. Check if user record exists in this school
        const teacher = await prisma.user.findFirst({
            where: { email: email, schoolId: dbUser.schoolId }
        });

        if (teacher) {
            const prefs = (dbUser.preferences as any) || {};
            const hasFullAccess = prefs?.fullAccess === true;

            // Intercept for PRINCIPAL without full access on verified active staff
            if (teacher.verified && dbUser.role === 'PRINCIPAL' && !hasFullAccess) {
                await prisma.actionRequest.create({
                    data: {
                        schoolId: dbUser.schoolId,
                        requesterId: dbUser.id,
                        targetUserId: teacher.id,
                        actionType: 'DELETE_STAFF',
                        payload: { email },
                        status: 'PENDING'
                    }
                });
                return NextResponse.json({ success: true, pendingApproval: true, message: "Termination request sent to Owner" });
            }

            // Clean up teacher assignments, homeroom links, timetables, and unlink/delete atomically
            await prisma.$transaction(async (tx) => {
                await tx.teacherAssignment.deleteMany({
                    where: { teacherId: teacher.id }
                });
                await tx.timetable.deleteMany({
                    where: { teacherId: teacher.id }
                });
                await tx.class.updateMany({
                    where: { homeroomTeacherId: teacher.id },
                    data: { homeroomTeacherId: null }
                });

                if (!teacher.verified) {
                    // Unverified placeholder user can be safely deleted or unlinked
                    await tx.user.delete({ where: { id: teacher.id } }).catch(async () => {
                        await tx.user.update({
                            where: { id: teacher.id },
                            data: { schoolId: null }
                        });
                    });
                } else {
                    await tx.user.update({
                        where: { id: teacher.id },
                        data: { schoolId: null }
                    });
                }
            });
        }

        // Trigger Cache Invalidation for the personnel registry
        revalidateTag(getSchoolTag(CACHE_TAGS.USER_PROFILE, dbUser.schoolId), 'max');

        // Log Activity
        await logActivity({
            userId: dbUser.id,
            schoolId: dbUser.schoolId,
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
