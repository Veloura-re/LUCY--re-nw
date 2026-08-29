import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
    try {
        if (process.env.NODE_ENV === 'production') {
            return NextResponse.json({ error: 'Endpoint permanently disabled in production environment.' }, { status: 403 });
        }

        const authHeader = request.headers.get('authorization');
        const expectedSecret = process.env.ADMIN_DEV_RESET_SECRET;
        if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const schools = await prisma.school.findMany({ select: { id: true } });
        console.log(`Found ${schools.length} schools to delete.`);

        // Find superadmins to preserve
        const superadmins = await prisma.user.findMany({
            where: { role: 'SUPERADMIN' },
            select: { id: true, email: true }
        });
        const superadminIds = superadmins.map(s => s.id);
        
        const usersToDelete = await prisma.user.findMany({
            where: { role: { not: 'SUPERADMIN' } },
            select: { id: true }
        });
        const userIdsToDelete = usersToDelete.map(u => u.id);

        const CHUNK_SIZE = 50;
        for (let i = 0; i < schools.length; i += CHUNK_SIZE) {
            const chunk = schools.slice(i, i + CHUNK_SIZE);
            const ids = chunk.map(s => s.id);

            await prisma.$transaction(async (tx: any) => {
                await tx.marklistMark.deleteMany({ where: { entry: { config: { schoolId: { in: ids } } } } }).catch(() => {});
                await tx.marklistEntry.deleteMany({ where: { config: { schoolId: { in: ids } } } }).catch(() => {});
                await tx.marklistColumn.deleteMany({ where: { config: { schoolId: { in: ids } } } }).catch(() => {});
                await tx.parentStudentLink.deleteMany({ where: { student: { schoolId: { in: ids } } } }).catch(() => {});
                await tx.attendanceRecord.deleteMany({ where: { student: { schoolId: { in: ids } } } }).catch(() => {});
                await tx.gradeRecord.deleteMany({ where: { student: { schoolId: { in: ids } } } }).catch(() => {});
                await tx.examAttempt.deleteMany({ where: { student: { schoolId: { in: ids } } } }).catch(() => {});
                await tx.certificate.deleteMany({ where: { student: { schoolId: { in: ids } } } }).catch(() => {});
                await tx.studentRemark.deleteMany({ where: { student: { schoolId: { in: ids } } } }).catch(() => {});
                await tx.internalNote.deleteMany({ where: { student: { schoolId: { in: ids } } } }).catch(() => {});
                await tx.absenceAuthorization.deleteMany({ where: { student: { schoolId: { in: ids } } } }).catch(() => {});
                await tx.student.deleteMany({ where: { schoolId: { in: ids } } }).catch(() => {});

                await tx.payment.deleteMany({ where: { invoice: { schoolId: { in: ids } } } }).catch(() => {});
                await tx.invoiceItem.deleteMany({ where: { invoice: { schoolId: { in: ids } } } }).catch(() => {});
                await tx.invoice.deleteMany({ where: { schoolId: { in: ids } } }).catch(() => {});
                await tx.feeStructure.deleteMany({ where: { schoolId: { in: ids } } }).catch(() => {});
                await tx.billingReceipt.deleteMany({ where: { schoolId: { in: ids } } }).catch(() => {});
                await tx.institutionalExpense.deleteMany({ where: { schoolId: { in: ids } } }).catch(() => {});

                await tx.assignmentSubmission.deleteMany({ where: { schoolId: { in: ids } } }).catch(() => {});
                await tx.assignment.deleteMany({ where: { schoolId: { in: ids } } }).catch(() => {});
                await tx.marklistConfig.deleteMany({ where: { schoolId: { in: ids } } }).catch(() => {});
                await tx.resourceProgress.deleteMany({ where: { book: { schoolId: { in: ids } } } }).catch(() => {});
                await tx.unitPackResource.deleteMany({ where: { unitPack: { schoolId: { in: ids } } } }).catch(() => {});
                await tx.bookRequest.deleteMany({ where: { schoolId: { in: ids } } }).catch(() => {});
                await tx.unitPack.deleteMany({ where: { schoolId: { in: ids } } }).catch(() => {});
                await tx.book.deleteMany({ where: { schoolId: { in: ids } } }).catch(() => {});
                await tx.lesson.deleteMany({ where: { class: { grade: { schoolId: { in: ids } } } } }).catch(() => {});

                await tx.exam.deleteMany({ where: { class: { grade: { schoolId: { in: ids } } } } }).catch(() => {});
                await tx.timetable.deleteMany({ where: { class: { grade: { schoolId: { in: ids } } } } }).catch(() => {});
                await tx.teacherAssignment.deleteMany({ where: { class: { grade: { schoolId: { in: ids } } } } }).catch(() => {});
                await tx.period.deleteMany({ where: { schoolId: { in: ids } } }).catch(() => {});
                await tx.class.deleteMany({ where: { grade: { schoolId: { in: ids } } } }).catch(() => {});
                await tx.grade.deleteMany({ where: { schoolId: { in: ids } } }).catch(() => {});
                await tx.subject.deleteMany({ where: { schoolId: { in: ids } } }).catch(() => {});
                await tx.academicTerm.deleteMany({ where: { schoolId: { in: ids } } }).catch(() => {});

                await tx.message.deleteMany({ where: { schoolId: { in: ids } } }).catch(() => {});
                await tx.chatRoomMember.deleteMany({ where: { chatRoom: { schoolId: { in: ids } } } }).catch(() => {});
                await tx.chatRoom.deleteMany({ where: { schoolId: { in: ids } } }).catch(() => {});
                await tx.event.deleteMany({ where: { schoolId: { in: ids } } }).catch(() => {});
                await tx.auditLog.deleteMany({ where: { user: { schoolId: { in: ids } } } }).catch(() => {});
                await tx.errorLog.deleteMany({ where: { schoolId: { in: ids } } }).catch(() => {});
                await tx.inviteToken.deleteMany({ where: { schoolId: { in: ids } } }).catch(() => {});
                await tx.actionRequest.deleteMany({ where: { schoolId: { in: ids } } }).catch(() => {});
                await tx.restorePoint.deleteMany({ where: { schoolId: { in: ids } } }).catch(() => {});

                await tx.staffAttendanceRecord.deleteMany({ where: { user: { schoolId: { in: ids } } } }).catch(() => {});
                await tx.staffPayroll.deleteMany({ where: { user: { schoolId: { in: ids } } } }).catch(() => {});
                
                await tx.user.deleteMany({ 
                    where: { 
                        schoolId: { in: ids },
                        role: { not: 'SUPERADMIN' }
                    } 
                });

                await tx.school.deleteMany({ where: { id: { in: ids } } }).catch(() => {});
            }, { maxWait: 120000, timeout: 300000 });
        }

        await prisma.user.deleteMany({
            where: {
                role: { not: 'SUPERADMIN' }
            }
        }).catch(() => {});

        return NextResponse.json({ success: true, message: 'Schools and non-superadmin users deleted successfully.' });
    } catch (e: any) {
        return NextResponse.json({ error: e.message || 'Error occurred' }, { status: 500 });
    }
}
