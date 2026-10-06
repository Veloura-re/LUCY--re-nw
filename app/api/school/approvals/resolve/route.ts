import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole, requireSchoolLinked } from '@/lib/security';
import { logActivity } from '@/lib/audit';
import { revalidateTag } from 'next/cache';
import { CACHE_TAGS, getSchoolTag } from '@/lib/cache-keys';

export async function POST(request: Request) {
    try {
        const user = await requireSchoolLinked();
        
        // Ensure only OWNER and SUPERADMIN can resolve approvals
        if (user.role !== 'OWNER' && user.role !== 'SUPERADMIN') {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        const { requestId, resolution, reason } = await request.json() as any;
        
        if (!requestId || !resolution || !['APPROVED', 'REJECTED'].includes(resolution)) {
            return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
        }

        const actionRequest = await prisma.actionRequest.findUnique({
            where: { id: requestId, schoolId: user.schoolId }
        });

        if (!actionRequest || actionRequest.status !== 'PENDING') {
            return NextResponse.json({ error: "Request not found or already resolved" }, { status: 400 });
        }

        const payload = actionRequest.payload as any || {};

        // If Approved, execute the action
        if (resolution === 'APPROVED') {
            if (actionRequest.actionType === 'DELETE_STAFF') {
                const email = payload.email;
                if (email) {
                    await prisma.$transaction(async (tx) => {
                        const teacher = await tx.user.findFirst({
                            where: { email: email, schoolId: user.schoolId }
                        });
                        
                        if (teacher) {
                            await tx.teacherAssignment.deleteMany({ where: { teacherId: teacher.id } });
                            await tx.timetable.deleteMany({ where: { teacherId: teacher.id } });
                            await tx.user.update({ where: { id: teacher.id }, data: { schoolId: null } });
                        }
                        
                        await tx.inviteToken.deleteMany({
                            where: { email: email, schoolId: user.schoolId }
                        });
                    });
                    
                    revalidateTag(getSchoolTag(CACHE_TAGS.USER_PROFILE, user.schoolId), 'max');
                }
            } else if (actionRequest.actionType === 'DELETE_STUDENT') {
                const studentId = payload.studentId;
                if (studentId) {
                    const student = await prisma.student.delete({
                        where: { id: studentId, schoolId: user.schoolId }
                    });
                    if (student?.userId) {
                        try {

                            const supabaseAdmin = createSupabaseAdmin(
                                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                                process.env.SUPABASE_SERVICE_ROLE_KEY!
                            );
                            await supabaseAdmin.auth.admin.deleteUser(student.userId);
                            await prisma.user.delete({ where: { id: student.userId } }).catch(() => {});
                        } catch (err) {}
                    }
                    revalidateTag(getSchoolTag(CACHE_TAGS.STUDENTS, user.schoolId), 'max');
                }
            } else if (actionRequest.actionType === 'DELETE_MARKLIST') {
                const marklistId = payload.marklistId;
                if (marklistId) {
                    const exam = await prisma.exam.findFirst({
                        where: { id: marklistId, class: { grade: { schoolId: user.schoolId } } }
                    });
                    if (exam) {
                        await prisma.exam.delete({
                            where: { id: exam.id }
                        });
                    }
                }
            }
        }

        // Update the request status
        const resolvedRequest = await prisma.actionRequest.update({
            where: { id: requestId },
            data: { 
                status: resolution,
                reason: reason || null
            }
        });

        await logActivity({
            userId: user.id,
            schoolId: user.schoolId,
            action: `RESOLVE_REQUEST_${resolution}`,
            resourceType: 'ACTION_REQUEST',
            resourceId: resolvedRequest.id,
            after: resolvedRequest
        });

        return NextResponse.json({ success: true, resolution });

    } catch (e: any) {
        return NextResponse.json({ error: e.message || "Failed to resolve request" }, { status: 500 });
    }
}
