import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifySuperAdmin } from '@/lib/admin-auth';
import { createAdminClient } from '@/utils/supabase/admin';

// PATCH - Update school status (suspend/activate)
export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const dbUser = await verifySuperAdmin();

    if (!dbUser) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const { status } = await request.json();

    if (!['ACTIVE', 'SUSPENDED', 'PENDING'].includes(status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    try {
        const school = await prisma.school.update({
            where: { id },
            data: { status }
        });

        return NextResponse.json({ school });
    } catch (error) {
        console.error("Error updating school:", error);
        return NextResponse.json({ error: 'Failed to update school' }, { status: 500 });
    }
}

import * as fs from 'fs';

// DELETE - Delete school and all related data
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const dbUser = await verifySuperAdmin();

    if (!dbUser) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    try {
        console.log(`[AdminAPI] Purging School: ${id}`);

        // 0. Verify the school even exists before attempting a heavy purge
        const existingSchool = await prisma.school.findUnique({ where: { id } });

        if (!existingSchool) {
            console.log(`[AdminAPI] School ${id} already deleted. Acknowledging.`);
            return NextResponse.json({ success: true, message: 'Already deleted' });
        }

        // Collect all user IDs associated with the school BEFORE deleting
        // so we can purge them from Supabase Auth afterwards
        const schoolUsers = await prisma.user.findMany({
            where: { schoolId: id },
            select: { id: true }
        });
        const userIds = schoolUsers.map((u: { id: string }) => u.id);
        console.log(`[AdminAPI] Found ${userIds.length} users to purge from Supabase.`);

        // Run the full DB deletion in a single transaction
        await prisma.$transaction(async (tx: any) => {
            console.log('[AdminAPI-Trace] Starting DB transaction for purge...');
            // 1. Delete Student-related dependents (deepest leaves first)
            await tx.marklistMark.deleteMany({ where: { entry: { config: { schoolId: id } } } });
            await tx.marklistEntry.deleteMany({ where: { config: { schoolId: id } } });
            await tx.marklistColumn.deleteMany({ where: { config: { schoolId: id } } });
            await tx.parentStudentLink.deleteMany({ where: { student: { schoolId: id } } });
            await tx.attendanceRecord.deleteMany({ where: { student: { schoolId: id } } });
            await tx.gradeRecord.deleteMany({ where: { student: { schoolId: id } } });
            await tx.examAttempt.deleteMany({ where: { student: { schoolId: id } } });
            await tx.certificate.deleteMany({ where: { student: { schoolId: id } } });
            await tx.studentRemark.deleteMany({ where: { student: { schoolId: id } } });
            await tx.internalNote.deleteMany({ where: { student: { schoolId: id } } });
            await tx.absenceAuthorization.deleteMany({ where: { student: { schoolId: id } } });
            // Students must be deleted HERE — before grades, because Student.gradeId → Grade (FK)
            await tx.student.deleteMany({ where: { schoolId: id } });
            console.log('[AdminAPI] [1/5] Student data purged.');

            // 2. Delete School Business dependents
            await tx.payment.deleteMany({ where: { invoice: { schoolId: id } } });
            await tx.invoiceItem.deleteMany({ where: { invoice: { schoolId: id } } });
            await tx.invoice.deleteMany({ where: { schoolId: id } });
            await tx.feeStructure.deleteMany({ where: { schoolId: id } });
            console.log('[AdminAPI] [2/5] Financial data purged.');

            // 2.5 Delete Curricular & Library dependents
            await tx.marklistConfig.deleteMany({ where: { schoolId: id } });
            await tx.resourceProgress.deleteMany({ where: { book: { schoolId: id } } });
            await tx.unitPackResource.deleteMany({ where: { unitPack: { schoolId: id } } });
            await tx.bookRequest.deleteMany({ where: { schoolId: id } });
            await tx.unitPack.deleteMany({ where: { schoolId: id } });
            await tx.book.deleteMany({ where: { schoolId: id } });
            await tx.lesson.deleteMany({ where: { class: { grade: { schoolId: id } } } });
            console.log('[AdminAPI] [2.5/5] Educational resources purged.');

            // 3. Delete Academic Structure
            await tx.exam.deleteMany({ where: { class: { grade: { schoolId: id } } } });
            await tx.timetable.deleteMany({ where: { class: { grade: { schoolId: id } } } });
            await tx.teacherAssignment.deleteMany({ where: { class: { grade: { schoolId: id } } } });
            await tx.period.deleteMany({ where: { schoolId: id } });
            await tx.class.deleteMany({ where: { grade: { schoolId: id } } });
            await tx.grade.deleteMany({ where: { schoolId: id } });
            await tx.subject.deleteMany({ where: { schoolId: id } });
            console.log('[AdminAPI] [3/5] Academic infrastructure purged.');

            // 4. Delete Communication & Interaction
            await tx.message.deleteMany({ where: { schoolId: id } });
            await tx.chatRoomMember.deleteMany({ where: { chatRoom: { schoolId: id } } });
            await tx.chatRoom.deleteMany({ where: { schoolId: id } });
            await tx.event.deleteMany({ where: { schoolId: id } });
            await tx.auditLog.deleteMany({ where: { user: { schoolId: id } } });
            await tx.inviteToken.deleteMany({ where: { schoolId: id } });
            console.log('[AdminAPI] [4/5] Communication logs purged.');

            // 5. Delete Staff attendance & remaining users
            await tx.staffAttendanceRecord.deleteMany({ where: { user: { schoolId: id } } });
            await tx.user.deleteMany({ where: { schoolId: id } });
            console.log('[AdminAPI] [5/5] Staff records purged.');

            // 7. Finally delete the school
            await tx.school.delete({
                where: { id }
            });
            console.log('[AdminAPI] School record deleted from DB.');
        }, { maxWait: 60000, timeout: 120000 });

        // After DB transaction succeeds — purge Supabase Auth accounts
        if (userIds.length > 0) {
            const supabaseAdmin = createAdminClient();
            const authDeletionErrors: string[] = [];
            console.log(`[AdminAPI] Purging ${userIds.length} auth accounts from Supabase...`);

            await Promise.all(
                userIds.map(async (uid: string) => {
                    const { error } = await supabaseAdmin.auth.admin.deleteUser(uid);
                    if (error) {
                        // Log but don't fail — DB data is already gone
                        console.warn(`[school-delete] Failed to delete Supabase auth user ${uid}:`, error.message);
                        authDeletionErrors.push(uid);
                    }
                })
            );

            if (authDeletionErrors.length > 0) {
                console.warn(`[school-delete] ${authDeletionErrors.length}/${userIds.length} Supabase auth accounts could not be deleted.`);
            } else {
                console.log(`[school-delete] Deleted ${userIds.length} Supabase auth accounts for school ${id}.`);
            }
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[AdminAPI] Error purging school:", error);
        return NextResponse.json({
            error: 'Failed to delete school',
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}
