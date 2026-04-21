const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testSchoolDelete() {
    const id = '2c6dcd96-9569-4674-9a0c-3b69cd61595d';
    const school = await prisma.school.findFirst({ where: { id } });

    if (!school) {
        console.log("No test school found with ID:", id);
        return;
    }

    console.log(`[Diagnostic] Purging School: ${school.name} (${id})`);

    try {
        await prisma.$transaction(async (tx) => {
            console.log('[Diagnostic] Starting DB transaction for purge...');

            // 1. Delete Student-related dependents
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

            await tx.student.deleteMany({ where: { schoolId: id } });
            console.log('[Diagnostic] [1/5] Student data purged.');

            // 2. Delete School Business dependents
            await tx.payment.deleteMany({ where: { invoice: { schoolId: id } } });
            await tx.invoiceItem.deleteMany({ where: { invoice: { schoolId: id } } });
            await tx.invoice.deleteMany({ where: { schoolId: id } });
            await tx.feeStructure.deleteMany({ where: { schoolId: id } });
            console.log('[Diagnostic] [2/5] Financial data purged.');

            // 2.5 Delete Curricular & Library dependents
            await tx.marklistConfig.deleteMany({ where: { schoolId: id } });
            await tx.resourceProgress.deleteMany({ where: { book: { schoolId: id } } });
            await tx.unitPackResource.deleteMany({ where: { unitPack: { schoolId: id } } });
            await tx.bookRequest.deleteMany({ where: { schoolId: id } });
            await tx.unitPack.deleteMany({ where: { schoolId: id } });
            await tx.book.deleteMany({ where: { schoolId: id } });
            await tx.lesson.deleteMany({ where: { class: { grade: { schoolId: id } } } });
            console.log('[Diagnostic] [2.5/5] Educational resources purged.');

            // 3. Delete Academic Structure
            await tx.exam.deleteMany({ where: { class: { grade: { schoolId: id } } } });
            await tx.timetable.deleteMany({ where: { class: { grade: { schoolId: id } } } });
            await tx.teacherAssignment.deleteMany({ where: { class: { grade: { schoolId: id } } } });
            await tx.period.deleteMany({ where: { schoolId: id } });
            await tx.class.deleteMany({ where: { grade: { schoolId: id } } });
            await tx.grade.deleteMany({ where: { schoolId: id } });
            await tx.subject.deleteMany({ where: { schoolId: id } });
            console.log('[Diagnostic] [3/5] Academic infrastructure purged.');

            // 4. Delete Communication & Interaction
            await tx.message.deleteMany({ where: { schoolId: id } });
            await tx.chatRoomMember.deleteMany({ where: { chatRoom: { schoolId: id } } });
            await tx.chatRoom.deleteMany({ where: { schoolId: id } });
            await tx.event.deleteMany({ where: { schoolId: id } });
            await tx.auditLog.deleteMany({ where: { user: { schoolId: id } } });
            await tx.inviteToken.deleteMany({ where: { schoolId: id } });
            console.log('[Diagnostic] [4/5] Communication logs purged.');

            // 5. Delete Staff attendance & remaining users
            await tx.staffAttendanceRecord.deleteMany({ where: { user: { schoolId: id } } });
            await tx.user.deleteMany({ where: { schoolId: id } });
            console.log('[Diagnostic] [5/5] Staff records purged.');

            // 7. Finally delete the school
            await tx.school.delete({
                where: { id }
            });
            console.log('[Diagnostic] School record deleted from DB.');
        }, { maxWait: 60000, timeout: 120000 });

        console.log("✅ School perfectly purged.");
    } catch (error) {
        console.error("❌ FAILED AT DEPENDENCY:", error);
    } finally {
        await prisma.$disconnect();
    }
}

testSchoolDelete();
