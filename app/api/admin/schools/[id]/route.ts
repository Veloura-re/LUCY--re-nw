import { NextResponse } from 'next/server';
import { verifySuperAdmin } from '@/lib/admin-auth';
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';
import { createAdminClient } from '@/utils/supabase/admin';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/audit';
import { archiveSchoolAuditTrail, purgeSchoolFiles } from '@/lib/audit-archive';
import { publicErrorMessage } from '@/lib/security';

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
    const { status, subscriptionStatus, trialEndsAt } = await request.json() as any;

    const updates: any = {};
    if (status) {
        if (!['ACTIVE', 'SUSPENDED', 'PENDING'].includes(status)) {
            return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
        }
        updates.status = status;
    }
    if (subscriptionStatus !== undefined) {
        updates.subscriptionStatus = subscriptionStatus;
    }
    if (trialEndsAt !== undefined) {
        updates.trialEndsAt = trialEndsAt;
    }

    try {
        if (prisma) {
            const school = await prisma.school.update({
                where: { id },
                data: updates
            });
            return NextResponse.json({ school });
        }

        const supabaseAdmin = createSupabaseAdmin(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );
        
        const { data: school, error } = await supabaseAdmin
            .from('School')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        
        // Audit log
        try {
            const _ip = request?.headers?.get('x-forwarded-for')?.split(',')[0]?.trim() || request?.headers?.get('cf-connecting-ip') || undefined;
            const _userId = dbUser?.id || undefined;
            if (_userId) {
                await logActivity({ userId: _userId, action: 'UPDATE', resourceType: 'school', ip: _ip || undefined });
            }
        } catch { /* non-blocking */ }

        return NextResponse.json({ school });
    } catch (error) {
        console.error("Error updating school:", error);
        return NextResponse.json({ error: 'Failed to update school' }, { status: 500 });
    }
}

// DELETE - Purge school and all dependent relational records cleanly
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const dbUser = await verifySuperAdmin();

    if (!dbUser) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    // Validate UUID format to protect SQL safety
    const uuidRegex = /^[0-9a-fA-F-]{8}-[0-9a-fA-F-]{4}-[0-9a-fA-F-]{4}-[0-9a-fA-F-]{4}-[0-9a-fA-F-]{12}$/;
    if (!uuidRegex.test(id)) {
        return NextResponse.json({ error: 'Invalid school ID format' }, { status: 400 });
    }

    try {
        console.log(`[AdminAPI] Purging School: ${id} via full dependency-graph SQL cascade`);

        let userIds: string[] = [];
        let archive: { path: string; count: number } | null = null;
        let purgedSchoolName: string | null = null;

        if (prisma) {
            // The tenant's audit trail is deleted with its users, so keep a copy first. If the
            // archive cannot be written, nothing is deleted.
            purgedSchoolName = (await prisma.school.findUnique({ where: { id }, select: { name: true } }))?.name ?? null;
            archive = await archiveSchoolAuditTrail(id);

            // Collect user IDs for Supabase Auth cleanup
            try {
                const schoolUsers = await prisma.user.findMany({
                    where: { schoolId: id, role: { not: 'SUPERADMIN' } },
                    select: { id: true }
                });
                userIds = schoolUsers.map(u => u.id);
            } catch (e) {
                console.warn("[AdminAPI] User collection error (continuing):", e);
            }

            // Single atomic Postgres DO block executes all deletions in exact topological leaf-to-root order
            const purgeSql = `
                DO $$
                DECLARE
                    s_id text := '${id}';
                BEGIN
                    -- 0. Break circular self-referencing and prerequisite foreign keys
                    UPDATE "Exam" SET "prerequisiteId" = NULL WHERE "classId" IN (SELECT id FROM "Class" WHERE "schoolId" = s_id OR "gradeId" IN (SELECT id FROM "Grade" WHERE "schoolId" = s_id)) OR "subjectId" IN (SELECT id FROM "Subject" WHERE "schoolId" = s_id);
                    UPDATE "Book" SET "prerequisiteId" = NULL WHERE "schoolId" = s_id OR "subjectId" IN (SELECT id FROM "Subject" WHERE "schoolId" = s_id);
                    UPDATE "Class" SET "homeroomTeacherId" = NULL WHERE "schoolId" = s_id OR "gradeId" IN (SELECT id FROM "Grade" WHERE "schoolId" = s_id);
                    UPDATE "Student" SET "classId" = NULL WHERE "schoolId" = s_id;

                    -- 1. Marklist marks and entries
                    DELETE FROM "MarklistMark" WHERE "entryId" IN (SELECT id FROM "MarklistEntry" WHERE "configId" IN (SELECT id FROM "MarklistConfig" WHERE "schoolId" = s_id OR "subjectId" IN (SELECT id FROM "Subject" WHERE "schoolId" = s_id)));
                    DELETE FROM "MarklistEntry" WHERE "configId" IN (SELECT id FROM "MarklistConfig" WHERE "schoolId" = s_id OR "subjectId" IN (SELECT id FROM "Subject" WHERE "schoolId" = s_id));
                    DELETE FROM "MarklistColumn" WHERE "configId" IN (SELECT id FROM "MarklistConfig" WHERE "schoolId" = s_id OR "subjectId" IN (SELECT id FROM "Subject" WHERE "schoolId" = s_id));
                    DELETE FROM "MarklistConfig" WHERE "schoolId" = s_id OR "subjectId" IN (SELECT id FROM "Subject" WHERE "schoolId" = s_id);

                    -- 2. Curriculum & Books
                    DELETE FROM "ResourceProgress" WHERE "bookId" IN (SELECT id FROM "Book" WHERE "schoolId" = s_id OR "subjectId" IN (SELECT id FROM "Subject" WHERE "schoolId" = s_id));
                    DELETE FROM "UnitPackResource" WHERE "unitPackId" IN (SELECT id FROM "UnitPack" WHERE "schoolId" = s_id) OR "bookId" IN (SELECT id FROM "Book" WHERE "schoolId" = s_id OR "subjectId" IN (SELECT id FROM "Subject" WHERE "schoolId" = s_id));
                    DELETE FROM "UnitPack" WHERE "schoolId" = s_id;
                    DELETE FROM "BookRequest" WHERE "schoolId" = s_id;
                    DELETE FROM "Book" WHERE "schoolId" = s_id OR "subjectId" IN (SELECT id FROM "Subject" WHERE "schoolId" = s_id);

                    -- 3. Teaching Assignments, Timetables, Lessons
                    DELETE FROM "TeacherAssignment" WHERE "subjectId" IN (SELECT id FROM "Subject" WHERE "schoolId" = s_id) OR "classId" IN (SELECT id FROM "Class" WHERE "schoolId" = s_id OR "gradeId" IN (SELECT id FROM "Grade" WHERE "schoolId" = s_id)) OR "teacherId" IN (SELECT id FROM "User" WHERE "schoolId" = s_id);
                    DELETE FROM "Timetable" WHERE "subjectId" IN (SELECT id FROM "Subject" WHERE "schoolId" = s_id) OR "classId" IN (SELECT id FROM "Class" WHERE "schoolId" = s_id OR "gradeId" IN (SELECT id FROM "Grade" WHERE "schoolId" = s_id)) OR "teacherId" IN (SELECT id FROM "User" WHERE "schoolId" = s_id) OR "periodId" IN (SELECT id FROM "Period" WHERE "schoolId" = s_id);
                    DELETE FROM "Lesson" WHERE "subjectId" IN (SELECT id FROM "Subject" WHERE "schoolId" = s_id) OR "classId" IN (SELECT id FROM "Class" WHERE "schoolId" = s_id OR "gradeId" IN (SELECT id FROM "Grade" WHERE "schoolId" = s_id)) OR "teacherId" IN (SELECT id FROM "User" WHERE "schoolId" = s_id) OR "periodId" IN (SELECT id FROM "Period" WHERE "schoolId" = s_id);

                    -- 4. Assignments & Submissions
                    DELETE FROM "AssignmentSubmission" WHERE "studentId" IN (SELECT id FROM "Student" WHERE "schoolId" = s_id) OR "assignmentId" IN (SELECT id FROM "Assignment" WHERE "schoolId" = s_id OR "subjectId" IN (SELECT id FROM "Subject" WHERE "schoolId" = s_id)) OR "schoolId" = s_id;
                    DELETE FROM "Assignment" WHERE "schoolId" = s_id OR "subjectId" IN (SELECT id FROM "Subject" WHERE "schoolId" = s_id) OR "classId" IN (SELECT id FROM "Class" WHERE "schoolId" = s_id OR "gradeId" IN (SELECT id FROM "Grade" WHERE "schoolId" = s_id)) OR "teacherId" IN (SELECT id FROM "User" WHERE "schoolId" = s_id);

                    -- 5. Exams, Attempts, Grades
                    DELETE FROM "ExamAttempt" WHERE "examId" IN (SELECT id FROM "Exam" WHERE "subjectId" IN (SELECT id FROM "Subject" WHERE "schoolId" = s_id) OR "classId" IN (SELECT id FROM "Class" WHERE "schoolId" = s_id OR "gradeId" IN (SELECT id FROM "Grade" WHERE "schoolId" = s_id))) OR "studentId" IN (SELECT id FROM "Student" WHERE "schoolId" = s_id);
                    DELETE FROM "GradeRecord" WHERE "studentId" IN (SELECT id FROM "Student" WHERE "schoolId" = s_id) OR "subjectId" IN (SELECT id FROM "Subject" WHERE "schoolId" = s_id) OR "examId" IN (SELECT id FROM "Exam" WHERE "subjectId" IN (SELECT id FROM "Subject" WHERE "schoolId" = s_id) OR "classId" IN (SELECT id FROM "Class" WHERE "schoolId" = s_id OR "gradeId" IN (SELECT id FROM "Grade" WHERE "schoolId" = s_id)));
                    DELETE FROM "Exam" WHERE "subjectId" IN (SELECT id FROM "Subject" WHERE "schoolId" = s_id) OR "classId" IN (SELECT id FROM "Class" WHERE "schoolId" = s_id OR "gradeId" IN (SELECT id FROM "Grade" WHERE "schoolId" = s_id)) OR "createdById" IN (SELECT id FROM "User" WHERE "schoolId" = s_id);

                    -- 6. Invoices, Payments, Fee Structures
                    DELETE FROM "Payment" WHERE "invoiceId" IN (SELECT id FROM "Invoice" WHERE "schoolId" = s_id);
                    DELETE FROM "InvoiceItem" WHERE "invoiceId" IN (SELECT id FROM "Invoice" WHERE "schoolId" = s_id) OR "feeStructureId" IN (SELECT id FROM "FeeStructure" WHERE "schoolId" = s_id OR "gradeId" IN (SELECT id FROM "Grade" WHERE "schoolId" = s_id));
                    DELETE FROM "Invoice" WHERE "schoolId" = s_id;
                    DELETE FROM "FeeStructure" WHERE "schoolId" = s_id OR "gradeId" IN (SELECT id FROM "Grade" WHERE "schoolId" = s_id);

                    -- 7. Chat & Communication
                    DELETE FROM "ChatRoomMember" WHERE "chatRoomId" IN (SELECT id FROM "ChatRoom" WHERE "schoolId" = s_id) OR "userId" IN (SELECT id FROM "User" WHERE "schoolId" = s_id);
                    DELETE FROM "Message" WHERE "schoolId" = s_id OR "chatRoomId" IN (SELECT id FROM "ChatRoom" WHERE "schoolId" = s_id) OR "fromUserId" IN (SELECT id FROM "User" WHERE "schoolId" = s_id);
                    DELETE FROM "ChatRoom" WHERE "schoolId" = s_id;

                    -- 8. Students & Sub-records
                    DELETE FROM "ParentStudentLink" WHERE "studentId" IN (SELECT id FROM "Student" WHERE "schoolId" = s_id);
                    DELETE FROM "AttendanceRecord" WHERE "studentId" IN (SELECT id FROM "Student" WHERE "schoolId" = s_id) OR "classId" IN (SELECT id FROM "Class" WHERE "schoolId" = s_id OR "gradeId" IN (SELECT id FROM "Grade" WHERE "schoolId" = s_id)) OR "subjectId" IN (SELECT id FROM "Subject" WHERE "schoolId" = s_id) OR "createdById" IN (SELECT id FROM "User" WHERE "schoolId" = s_id);
                    DELETE FROM "StudentRemark" WHERE "studentId" IN (SELECT id FROM "Student" WHERE "schoolId" = s_id) OR "teacherId" IN (SELECT id FROM "User" WHERE "schoolId" = s_id);
                    DELETE FROM "InternalNote" WHERE "studentId" IN (SELECT id FROM "Student" WHERE "schoolId" = s_id) OR "authorId" IN (SELECT id FROM "User" WHERE "schoolId" = s_id);
                    DELETE FROM "AbsenceAuthorization" WHERE "studentId" IN (SELECT id FROM "Student" WHERE "schoolId" = s_id) OR "userId" IN (SELECT id FROM "User" WHERE "schoolId" = s_id) OR "requestorId" IN (SELECT id FROM "User" WHERE "schoolId" = s_id);
                    DELETE FROM "Certificate" WHERE "studentId" IN (SELECT id FROM "Student" WHERE "schoolId" = s_id);
                    DELETE FROM "Student" WHERE "schoolId" = s_id;

                    -- 9. Classes, Periods, Subjects, Grades, Terms
                    DELETE FROM "Class" WHERE "schoolId" = s_id OR "gradeId" IN (SELECT id FROM "Grade" WHERE "schoolId" = s_id);
                    DELETE FROM "Period" WHERE "schoolId" = s_id;
                    DELETE FROM "Subject" WHERE "schoolId" = s_id;
                    DELETE FROM "Grade" WHERE "schoolId" = s_id;
                    DELETE FROM "AcademicTerm" WHERE "schoolId" = s_id;

                    -- 10. Operations & Logs
                    DELETE FROM "StaffPayroll" WHERE "userId" IN (SELECT id FROM "User" WHERE "schoolId" = s_id);
                    DELETE FROM "InstitutionalExpense" WHERE "schoolId" = s_id OR "loggedById" IN (SELECT id FROM "User" WHERE "schoolId" = s_id);
                    DELETE FROM "BillingReceipt" WHERE "schoolId" = s_id OR "submittedById" IN (SELECT id FROM "User" WHERE "schoolId" = s_id);
                    DELETE FROM "ActionRequest" WHERE "schoolId" = s_id OR "requesterId" IN (SELECT id FROM "User" WHERE "schoolId" = s_id) OR "targetUserId" IN (SELECT id FROM "User" WHERE "schoolId" = s_id);
                    DELETE FROM "Event" WHERE "schoolId" = s_id OR "createdById" IN (SELECT id FROM "User" WHERE "schoolId" = s_id);
                    DELETE FROM "RestorePoint" WHERE "schoolId" = s_id;
                    DELETE FROM "ErrorLog" WHERE "schoolId" = s_id OR "userId" IN (SELECT id FROM "User" WHERE "schoolId" = s_id);
                    DELETE FROM "AuditLog" WHERE "schoolId" = s_id OR "userId" IN (SELECT id FROM "User" WHERE "schoolId" = s_id);
                    DELETE FROM "InviteToken" WHERE "schoolId" = s_id;

                    -- 11. Faculty & Users
                    DELETE FROM "StaffAttendanceRecord" WHERE "userId" IN (SELECT id FROM "User" WHERE "schoolId" = s_id) OR "createdById" IN (SELECT id FROM "User" WHERE "schoolId" = s_id);
                    DELETE FROM "TeacherRemark" WHERE "teacherId" IN (SELECT id FROM "User" WHERE "schoolId" = s_id) OR "authorId" IN (SELECT id FROM "User" WHERE "schoolId" = s_id);
                    DELETE FROM "User" WHERE "schoolId" = s_id AND "role" != 'SUPERADMIN';
                    UPDATE "User" SET "schoolId" = NULL WHERE "schoolId" = s_id;

                    -- 12. Delete School
                    DELETE FROM "School" WHERE "id" = s_id;
                END $$;
            `;

            await prisma.$executeRawUnsafe(purgeSql);
            console.log(`[AdminAPI] Successfully purged school ${id} via atomic SQL cascade.`);
        } else {
            // Secondary Supabase REST fallback
            const supabaseAdmin = createSupabaseAdmin(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.SUPABASE_SERVICE_ROLE_KEY!
            );
            await supabaseAdmin.from('School').delete().eq('id', id);
        }

        // Purge Supabase Auth accounts for deleted users
        if (userIds.length > 0) {
            try {
                const supabaseAdminAuth = createAdminClient();
                await Promise.all(
                    userIds.map(async (uid: string) => {
                        await supabaseAdminAuth.auth.admin.deleteUser(uid).catch(() => {});
                    })
                );
            } catch (authErr) {
                console.warn("[AdminAPI] Supabase Auth cleanup error (non-fatal):", authErr);
            }
        }

        // Backups and uploads hold personal data too. A failure here must not undo the purge, so it
        // is logged for follow-up instead of failing the request.
        let filesRemoved: number | null = null;
        try {
            filesRemoved = await purgeSchoolFiles(id);
        } catch (fileErr) {
            console.error("[AdminAPI] Stored file cleanup failed (school already purged):", fileErr);
        }

        // Platform-level record of the deletion (the school and its own trail no longer exist).
        await logActivity({
            userId: dbUser.id,
            action: 'DELETE_SCHOOL',
            resourceType: 'school',
            resourceId: id,
            level: 'WARN',
            ip: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('cf-connecting-ip') || undefined,
            before: { name: purgedSchoolName },
            after: { archivedAuditEntries: archive?.count ?? null, archivePath: archive?.path ?? null, usersRemoved: userIds.length, filesRemoved }
        });

        return NextResponse.json({ success: true, message: 'School purged successfully' });
    } catch (error) {
        console.error("[AdminAPI] Error purging school:", error);
        return NextResponse.json({
            error: publicErrorMessage(error, 'Failed to delete school')
        }, { status: 500 });
    }
}
