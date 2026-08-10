import { NextResponse } from 'next/server';
import { verifySuperAdmin } from '@/lib/admin-auth';
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';
import { createAdminClient } from '@/utils/supabase/admin';
import { prisma } from '@/lib/prisma';

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
            const { logActivity } = await import('@/lib/audit');
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

// DELETE - Delete school and all related data completely
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
        console.log(`[AdminAPI] Purging School: ${id} with full relational teardown`);

        let userIds: string[] = [];

        if (prisma) {
            // Find school and all users
            const schoolUsers = await prisma.user.findMany({
                where: { schoolId: id },
                select: { id: true }
            });
            userIds = schoolUsers.map(u => u.id);

            // Collect student, class, chatroom, book, marklist, exam IDs
            const [students, classes, chatRooms, books, marklists, exams, unitPacks] = await Promise.all([
                prisma.student.findMany({ where: { schoolId: id }, select: { id: true } }),
                prisma.class.findMany({ where: { schoolId: id }, select: { id: true } }),
                prisma.chatRoom.findMany({ where: { schoolId: id }, select: { id: true } }),
                prisma.book.findMany({ where: { schoolId: id }, select: { id: true } }),
                prisma.marklistConfig.findMany({ where: { schoolId: id }, select: { id: true } }),
                prisma.exam.findMany({
                    where: {
                        OR: [
                            { class: { schoolId: id } },
                            { subject: { schoolId: id } },
                            { createdBy: { schoolId: id } }
                        ]
                    },
                    select: { id: true }
                }),
                prisma.unitPack.findMany({ where: { schoolId: id }, select: { id: true } })
            ]);

            const studentIds = students.map(s => s.id);
            const classIds = classes.map(c => c.id);
            const chatRoomIds = chatRooms.map(c => c.id);
            const bookIds = books.map(b => b.id);
            const marklistIds = marklists.map(m => m.id);
            const examIds = exams.map(e => e.id);
            const unitPackIds = unitPacks.map(u => u.id);

            // Perform robust sequential leaf purge in atomic transaction
            await prisma.$transaction(async (tx) => {
                // 1. Marklist marks and entries
                if (marklistIds.length > 0) {
                    await tx.marklistMark.deleteMany({ where: { entry: { configId: { in: marklistIds } } } }).catch(() => {});
                    await tx.marklistEntry.deleteMany({ where: { configId: { in: marklistIds } } }).catch(() => {});
                    await tx.marklistColumn.deleteMany({ where: { configId: { in: marklistIds } } }).catch(() => {});
                    await tx.marklistConfig.deleteMany({ where: { id: { in: marklistIds } } }).catch(() => {});
                }

                // 2. Books and unit packs
                if (bookIds.length > 0 || unitPackIds.length > 0) {
                    await tx.resourceProgress.deleteMany({ where: { bookId: { in: bookIds } } }).catch(() => {});
                    await tx.unitPackResource.deleteMany({
                        where: {
                            OR: [
                                { unitPackId: { in: unitPackIds } },
                                { bookId: { in: bookIds } }
                            ]
                        }
                    }).catch(() => {});
                    await tx.unitPack.deleteMany({ where: { id: { in: unitPackIds } } }).catch(() => {});
                    await tx.bookRequest.deleteMany({ where: { schoolId: id } }).catch(() => {});
                    await tx.book.deleteMany({ where: { id: { in: bookIds } } }).catch(() => {});
                }

                // 3. Invoices and payments
                await tx.payment.deleteMany({ where: { invoice: { schoolId: id } } }).catch(() => {});
                await tx.invoiceItem.deleteMany({ where: { invoice: { schoolId: id } } }).catch(() => {});
                await tx.invoice.deleteMany({ where: { schoolId: id } }).catch(() => {});
                await tx.feeStructure.deleteMany({ where: { schoolId: id } }).catch(() => {});

                // 4. Exams and grades
                if (examIds.length > 0) {
                    await tx.examAttempt.deleteMany({ where: { examId: { in: examIds } } }).catch(() => {});
                    await tx.gradeRecord.deleteMany({ where: { examId: { in: examIds } } }).catch(() => {});
                    await tx.exam.deleteMany({ where: { id: { in: examIds } } }).catch(() => {});
                }

                // 5. Chat and Comms
                if (chatRoomIds.length > 0) {
                    await tx.chatRoomMember.deleteMany({ where: { chatRoomId: { in: chatRoomIds } } }).catch(() => {});
                    await tx.message.deleteMany({ where: { chatRoomId: { in: chatRoomIds } } }).catch(() => {});
                    await tx.chatRoom.deleteMany({ where: { id: { in: chatRoomIds } } }).catch(() => {});
                }
                await tx.message.deleteMany({ where: { schoolId: id } }).catch(() => {});

                // 6. Student records
                if (studentIds.length > 0) {
                    await tx.parentStudentLink.deleteMany({ where: { studentId: { in: studentIds } } }).catch(() => {});
                    await tx.attendanceRecord.deleteMany({ where: { studentId: { in: studentIds } } }).catch(() => {});
                    await tx.gradeRecord.deleteMany({ where: { studentId: { in: studentIds } } }).catch(() => {});
                    await tx.studentRemark.deleteMany({ where: { studentId: { in: studentIds } } }).catch(() => {});
                    await tx.internalNote.deleteMany({ where: { studentId: { in: studentIds } } }).catch(() => {});
                    await tx.absenceAuthorization.deleteMany({ where: { studentId: { in: studentIds } } }).catch(() => {});
                    await tx.certificate.deleteMany({ where: { studentId: { in: studentIds } } }).catch(() => {});
                    await tx.assignmentSubmission.deleteMany({ where: { studentId: { in: studentIds } } }).catch(() => {});
                    await tx.student.deleteMany({ where: { id: { in: studentIds } } }).catch(() => {});
                }
                await tx.student.deleteMany({ where: { schoolId: id } }).catch(() => {});

                // 7. Classes, periods, assignments, timetable
                if (classIds.length > 0) {
                    await tx.timetable.deleteMany({ where: { classId: { in: classIds } } }).catch(() => {});
                    await tx.teacherAssignment.deleteMany({ where: { classId: { in: classIds } } }).catch(() => {});
                    await tx.lesson.deleteMany({ where: { classId: { in: classIds } } }).catch(() => {});
                }
                await tx.assignmentSubmission.deleteMany({ where: { schoolId: id } }).catch(() => {});
                await tx.assignment.deleteMany({ where: { schoolId: id } }).catch(() => {});
                await tx.class.deleteMany({ where: { schoolId: id } }).catch(() => {});
                await tx.period.deleteMany({ where: { schoolId: id } }).catch(() => {});
                await tx.subject.deleteMany({ where: { schoolId: id } }).catch(() => {});
                await tx.grade.deleteMany({ where: { schoolId: id } }).catch(() => {});
                await tx.academicTerm.deleteMany({ where: { schoolId: id } }).catch(() => {});

                // 8. Financial and operations metadata
                if (userIds.length > 0) {
                    await tx.staffPayroll.deleteMany({ where: { userId: { in: userIds } } }).catch(() => {});
                }
                await tx.institutionalExpense.deleteMany({ where: { schoolId: id } }).catch(() => {});
                await tx.billingReceipt.deleteMany({ where: { schoolId: id } }).catch(() => {});
                await tx.actionRequest.deleteMany({ where: { schoolId: id } }).catch(() => {});
                await tx.event.deleteMany({ where: { schoolId: id } }).catch(() => {});
                await tx.restorePoint.deleteMany({ where: { schoolId: id } }).catch(() => {});
                await tx.errorLog.deleteMany({ where: { schoolId: id } }).catch(() => {});
                await tx.auditLog.deleteMany({ where: { schoolId: id } }).catch(() => {});
                await tx.inviteToken.deleteMany({ where: { schoolId: id } }).catch(() => {});

                // 9. User-linked sub-records
                if (userIds.length > 0) {
                    await tx.staffAttendanceRecord.deleteMany({ where: { userId: { in: userIds } } }).catch(() => {});
                    await tx.teacherRemark.deleteMany({ where: { OR: [{ teacherId: { in: userIds } }, { authorId: { in: userIds } }] } }).catch(() => {});
                    await tx.chatRoomMember.deleteMany({ where: { userId: { in: userIds } } }).catch(() => {});
                    await tx.user.deleteMany({ where: { id: { in: userIds } } }).catch(() => {});
                }
                await tx.user.deleteMany({ where: { schoolId: id } }).catch(() => {});

                // 10. Delete the school itself
                await tx.school.delete({ where: { id } });
            });

            console.log(`[AdminAPI] Successfully purged school ${id} via Prisma.`);
        } else {
            // Secondary Supabase REST fallback
            const supabaseAdmin = createSupabaseAdmin(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.SUPABASE_SERVICE_ROLE_KEY!
            );
            await supabaseAdmin.from('School').delete().eq('id', id);
        }

        // Purge Supabase Auth accounts
        if (userIds.length > 0) {
            const supabaseAdminAuth = createAdminClient();
            await Promise.all(
                userIds.map(async (uid: string) => {
                    await supabaseAdminAuth.auth.admin.deleteUser(uid).catch(() => {});
                })
            );
        }

        // Audit log
        try {
            const { logActivity } = await import('@/lib/audit');
            const _ip = request?.headers?.get('x-forwarded-for')?.split(',')[0]?.trim() || request?.headers?.get('cf-connecting-ip') || undefined;
            const _userId = dbUser?.id || undefined;
            if (_userId) {
                await logActivity({ userId: _userId, action: 'DELETE', resourceType: 'school', ip: _ip || undefined });
            }
        } catch { /* non-blocking */ }

        return NextResponse.json({ success: true, message: 'School purged successfully' });
    } catch (error) {
        console.error("[AdminAPI] Error purging school:", error);
        return NextResponse.json({
            error: 'Failed to delete school',
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}
