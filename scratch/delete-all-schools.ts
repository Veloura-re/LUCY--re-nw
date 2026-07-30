import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const prisma = new PrismaClient();

async function deleteAllSchools() {
    const schools = await prisma.school.findMany({ select: { id: true } });
    console.log(`Found ${schools.length} schools to delete.`);

    // Find superadmins to preserve
    const superadmins = await prisma.user.findMany({
        where: { role: 'SUPERADMIN' },
        select: { id: true, email: true }
    });
    const superadminIds = superadmins.map(s => s.id);
    console.log(`Preserving ${superadmins.length} superadmins:`, superadmins.map(s => s.email));

    // Get all users EXCEPT superadmins to delete from Supabase Auth
    const usersToDelete = await prisma.user.findMany({
        where: { role: { not: 'SUPERADMIN' } },
        select: { id: true }
    });
    const userIdsToDelete = usersToDelete.map(u => u.id);

    const CHUNK_SIZE = 50;
    for (let i = 0; i < schools.length; i += CHUNK_SIZE) {
        const chunk = schools.slice(i, i + CHUNK_SIZE);
        const ids = chunk.map(s => s.id);
        console.log(`Deleting schools ${i + 1} to ${Math.min(i + CHUNK_SIZE, schools.length)} of ${schools.length}...`);

        try {
            await prisma.$transaction(async (tx: any) => {
                // 1. Delete Student-related dependents
                await tx.marklistMark.deleteMany({ where: { entry: { config: { schoolId: { in: ids } } } } });
                await tx.marklistEntry.deleteMany({ where: { config: { schoolId: { in: ids } } } });
                await tx.marklistColumn.deleteMany({ where: { config: { schoolId: { in: ids } } } });
                await tx.parentStudentLink.deleteMany({ where: { student: { schoolId: { in: ids } } } });
                await tx.attendanceRecord.deleteMany({ where: { student: { schoolId: { in: ids } } } });
                await tx.gradeRecord.deleteMany({ where: { student: { schoolId: { in: ids } } } });
                await tx.examAttempt.deleteMany({ where: { student: { schoolId: { in: ids } } } });
                await tx.certificate.deleteMany({ where: { student: { schoolId: { in: ids } } } });
                await tx.studentRemark.deleteMany({ where: { student: { schoolId: { in: ids } } } });
                await tx.internalNote.deleteMany({ where: { student: { schoolId: { in: ids } } } });
                await tx.absenceAuthorization.deleteMany({ where: { student: { schoolId: { in: ids } } } });
                await tx.student.deleteMany({ where: { schoolId: { in: ids } } });

                // 2. Delete School Business dependents
                await tx.payment.deleteMany({ where: { invoice: { schoolId: { in: ids } } } });
                await tx.invoiceItem.deleteMany({ where: { invoice: { schoolId: { in: ids } } } });
                await tx.invoice.deleteMany({ where: { schoolId: { in: ids } } });
                await tx.feeStructure.deleteMany({ where: { schoolId: { in: ids } } });
                await tx.billingReceipt.deleteMany({ where: { schoolId: { in: ids } } }).catch(() => {});
                await tx.institutionalExpense.deleteMany({ where: { schoolId: { in: ids } } }).catch(() => {});

                // 2.5 Delete Curricular & Library dependents
                await tx.assignmentSubmission.deleteMany({ where: { schoolId: { in: ids } } });
                await tx.assignment.deleteMany({ where: { schoolId: { in: ids } } });
                await tx.marklistConfig.deleteMany({ where: { schoolId: { in: ids } } });
                await tx.resourceProgress.deleteMany({ where: { book: { schoolId: { in: ids } } } });
                await tx.unitPackResource.deleteMany({ where: { unitPack: { schoolId: { in: ids } } } });
                await tx.bookRequest.deleteMany({ where: { schoolId: { in: ids } } });
                await tx.unitPack.deleteMany({ where: { schoolId: { in: ids } } });
                await tx.book.deleteMany({ where: { schoolId: { in: ids } } });
                await tx.lesson.deleteMany({ where: { class: { grade: { schoolId: { in: ids } } } } });

                // 3. Delete Academic Structure
                await tx.exam.deleteMany({ where: { class: { grade: { schoolId: { in: ids } } } } });
                await tx.timetable.deleteMany({ where: { class: { grade: { schoolId: { in: ids } } } } });
                await tx.teacherAssignment.deleteMany({ where: { class: { grade: { schoolId: { in: ids } } } } });
                await tx.period.deleteMany({ where: { schoolId: { in: ids } } });
                await tx.class.deleteMany({ where: { grade: { schoolId: { in: ids } } } });
                await tx.grade.deleteMany({ where: { schoolId: { in: ids } } });
                await tx.subject.deleteMany({ where: { schoolId: { in: ids } } });
                await tx.academicTerm.deleteMany({ where: { schoolId: { in: ids } } }).catch(() => {});

                // 4. Delete Communication & Interaction
                await tx.message.deleteMany({ where: { schoolId: { in: ids } } });
                await tx.chatRoomMember.deleteMany({ where: { chatRoom: { schoolId: { in: ids } } } });
                await tx.chatRoom.deleteMany({ where: { schoolId: { in: ids } } });
                await tx.event.deleteMany({ where: { schoolId: { in: ids } } });
                await tx.auditLog.deleteMany({ where: { user: { schoolId: { in: ids } } } }).catch(() => {});
                await tx.errorLog.deleteMany({ where: { schoolId: { in: ids } } }).catch(() => {});
                await tx.inviteToken.deleteMany({ where: { schoolId: { in: ids } } });
                await tx.actionRequest.deleteMany({ where: { schoolId: { in: ids } } }).catch(() => {});

                // 5. Delete System specific
                await tx.restorePoint.deleteMany({ where: { schoolId: { in: ids } } }).catch(() => {});

                // 6. Delete Staff attendance & remaining users (EXCEPT SUPERADMINS)
                await tx.staffAttendanceRecord.deleteMany({ where: { user: { schoolId: { in: ids } } } });
                await tx.staffPayroll.deleteMany({ where: { user: { schoolId: { in: ids } } } }).catch(() => {});
                
                // Finally, delete any user that belongs to these schools but is NOT a SUPERADMIN
                await tx.user.deleteMany({ 
                    where: { 
                        schoolId: { in: ids },
                        role: { not: 'SUPERADMIN' }
                    } 
                });

                // 7. Finally delete the school
                await tx.school.deleteMany({ where: { id: { in: ids } } });
            }, { maxWait: 120000, timeout: 300000 });
            console.log(`Successfully deleted chunk of schools from DB`);
        } catch (error) {
            console.error(`Failed to delete chunk of schools:`, error);
        }
    }

    // Now delete all users in the DB that don't belong to any school and are not superadmins
    console.log(`Deleting all other non-superadmin accounts...`);
    try {
        await prisma.user.deleteMany({
            where: {
                role: { not: 'SUPERADMIN' }
            }
        });
        console.log(`Successfully deleted all non-superadmin users from the DB.`);
    } catch (e) {
        console.error(`Error deleting other users:`, e);
    }

    // Delete Supabase Auth users
    if (userIdsToDelete.length > 0) {
        try {
            const { createClient } = await import('@supabase/supabase-js');
            if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
                const supabaseAdmin = createClient(
                    process.env.NEXT_PUBLIC_SUPABASE_URL,
                    process.env.SUPABASE_SERVICE_ROLE_KEY,
                    { auth: { autoRefreshToken: false, persistSession: false } }
                );
                console.log(`Deleting ${userIdsToDelete.length} users from Supabase Auth...`);
                // Chunk supabase deletes to avoid rate limits/timeouts
                for (let i = 0; i < userIdsToDelete.length; i += 20) {
                    const authChunk = userIdsToDelete.slice(i, i + 20);
                    await Promise.all(authChunk.map((uid: string) => supabaseAdmin.auth.admin.deleteUser(uid).catch(()=>{})));
                }
                console.log(`Successfully deleted users from Supabase Auth.`);
            }
        } catch (e) {
            console.error("Failed to delete from Supabase Auth:", e);
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
