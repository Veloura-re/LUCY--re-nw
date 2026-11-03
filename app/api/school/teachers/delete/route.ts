import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole, handleApiError, isValidEmail } from '@/lib/security';
import { logActivity } from '@/lib/audit';
import { revalidateTag } from 'next/cache';
import { CACHE_TAGS, getSchoolTag } from '@/lib/cache-keys';

export async function DELETE(request: Request) {
    try {
        const dbUser = await requireRole(['PRINCIPAL', 'OWNER', 'SUPERADMIN']);

        const body = (await request.json().catch(() => ({}))) as { email?: unknown };
        const rawEmail = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';

        if (!rawEmail || !isValidEmail(rawEmail)) {
            return NextResponse.json({ error: 'A valid email address is required' }, { status: 400 });
        }
        const email = rawEmail;

        if (!dbUser.schoolId) return NextResponse.json({ error: 'No school linked' }, { status: 400 });

        // 1. Delete all invite tokens for this email and school
        await prisma.inviteToken.deleteMany({
            where: {
                email: email,
                schoolId: dbUser.schoolId
            }
        });

        // 2. Prevent removing administrative leaders
        const existingAny = await prisma.user.findFirst({
            where: { email, schoolId: dbUser.schoolId },
            select: { id: true, role: true }
        });
        if (existingAny && !['TEACHER', 'RECORDER', 'ACCOUNTANT'].includes(existingAny.role)) {
            return NextResponse.json({ error: 'Cannot remove administrative leaders via staff deletion' }, { status: 403 });
        }

        // 3. Check if staff record exists in this school
        const teacher = await prisma.user.findFirst({
            where: {
                email: email,
                schoolId: dbUser.schoolId,
                role: { in: ['TEACHER', 'RECORDER', 'ACCOUNTANT'] }
            }
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
