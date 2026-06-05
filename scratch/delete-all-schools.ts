import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function deleteAllSchools() {
    const schools = await prisma.school.findMany();
    console.log(`Found ${schools.length} schools to delete.`);

    for (const school of schools) {
        const id = school.id;
        console.log(`Deleting school ${id} (${school.name})...`);

        let userIds: string[] = [];
        try {
            const schoolUsers = await prisma.user.findMany({
                where: { schoolId: id },
                select: { id: true }
            });
            userIds = schoolUsers.map(u => u.id);

            await prisma.$transaction(async (tx: any) => {
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

                // 2. Delete School Business dependents
                await tx.payment.deleteMany({ where: { invoice: { schoolId: id } } });
                await tx.invoiceItem.deleteMany({ where: { invoice: { schoolId: id } } });
                await tx.invoice.deleteMany({ where: { schoolId: id } });
                await tx.feeStructure.deleteMany({ where: { schoolId: id } });

                // 2.5 Delete Curricular & Library dependents
                await tx.assignmentSubmission.deleteMany({ where: { schoolId: id } });
                await tx.assignment.deleteMany({ where: { schoolId: id } });
                await tx.marklistConfig.deleteMany({ where: { schoolId: id } });
                await tx.resourceProgress.deleteMany({ where: { book: { schoolId: id } } });
                await tx.unitPackResource.deleteMany({ where: { unitPack: { schoolId: id } } });
                await tx.bookRequest.deleteMany({ where: { schoolId: id } });
                await tx.unitPack.deleteMany({ where: { schoolId: id } });
                await tx.book.deleteMany({ where: { schoolId: id } });
                await tx.lesson.deleteMany({ where: { class: { grade: { schoolId: id } } } });

                // 3. Delete Academic Structure
                await tx.exam.deleteMany({ where: { class: { grade: { schoolId: id } } } });
                await tx.timetable.deleteMany({ where: { class: { grade: { schoolId: id } } } });
                await tx.teacherAssignment.deleteMany({ where: { class: { grade: { schoolId: id } } } });
                await tx.period.deleteMany({ where: { schoolId: id } });
                await tx.class.deleteMany({ where: { grade: { schoolId: id } } });
                await tx.grade.deleteMany({ where: { schoolId: id } });
                await tx.subject.deleteMany({ where: { schoolId: id } });

                // 4. Delete Communication & Interaction
                await tx.message.deleteMany({ where: { schoolId: id } });
                await tx.chatRoomMember.deleteMany({ where: { chatRoom: { schoolId: id } } });
                await tx.chatRoom.deleteMany({ where: { schoolId: id } });
                await tx.event.deleteMany({ where: { schoolId: id } });
                await tx.auditLog.deleteMany({ where: { user: { schoolId: id } } });
                await tx.inviteToken.deleteMany({ where: { schoolId: id } });

                // 5. Delete Staff attendance & remaining users
                await tx.staffAttendanceRecord.deleteMany({ where: { user: { schoolId: id } } });
                // We also need to delete StaffPayroll before user
                await tx.staffPayroll.deleteMany({ where: { user: { schoolId: id } } }).catch(() => {});
                await tx.user.deleteMany({ where: { schoolId: id } });

                // 7. Finally delete the school
                await tx.school.delete({ where: { id } });
            }, { maxWait: 60000, timeout: 120000 });
            console.log(`Successfully deleted school ${id} from DB`);
            
            // Delete Supabase Auth users
            if (userIds.length > 0) {
                try {
                    const { createClient } = require('@supabase/supabase-js');
                    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
                        const supabaseAdmin = createClient(
                            process.env.NEXT_PUBLIC_SUPABASE_URL,
                            process.env.SUPABASE_SERVICE_ROLE_KEY,
                            { auth: { autoRefreshToken: false, persistSession: false } }
                        );
                        console.log(`Deleting ${userIds.length} users from Supabase Auth...`);
                        await Promise.all(userIds.map((uid: string) => supabaseAdmin.auth.admin.deleteUser(uid).catch(()=>{})));
                    }
                } catch (e) {
                    console.error("Failed to delete from Supabase Auth:", e);
                }
            }
            
        } catch (error) {
            console.error(`Failed to delete school ${id}:`, error);
        }
    }
}

deleteAllSchools()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
