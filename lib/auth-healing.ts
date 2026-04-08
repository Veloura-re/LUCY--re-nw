import { prisma } from '@/lib/prisma';

/**
 * Heals a user ID mismatch by migrating all related records from a placeholder ID (usually numeric or from an old DB)
 * to the new Supabase-provided UUID.
 */
export async function healUserMismatch(placeholderId: string, userId: string, email: string) {
    console.warn(`[Auth Healing] Initiating migration for ${email}. Placeholder: ${placeholderId}, Target: ${userId}`);

    try {
        const healedUser = await prisma.$transaction(async (tx) => {
            // 1. Teacher/Staff related
            await tx.teacherAssignment.updateMany({ where: { teacherId: placeholderId }, data: { teacherId: userId } });
            await tx.timetable.updateMany({ where: { teacherId: placeholderId }, data: { teacherId: userId } });
            await tx.class.updateMany({ where: { homeroomTeacherId: placeholderId }, data: { homeroomTeacherId: userId } });
            await tx.marklistConfig.updateMany({ where: { teacherId: placeholderId }, data: { teacherId: userId } });

            // 2. Content & Grading
            await tx.exam.updateMany({ where: { createdById: placeholderId }, data: { createdById: userId } });
            await tx.exam.updateMany({ where: { lockedById: placeholderId }, data: { lockedById: userId } });
            await tx.lesson.updateMany({ where: { teacherId: placeholderId }, data: { teacherId: userId } });
            await tx.gradeRecord.updateMany({ where: { createdById: placeholderId }, data: { createdById: userId } });
            await tx.attendanceRecord.updateMany({ where: { createdById: placeholderId }, data: { createdById: userId } });
            await tx.attendanceRecord.updateMany({ where: { lockedById: placeholderId }, data: { lockedById: userId } });

            // 3. Communications
            await tx.message.updateMany({ where: { fromUserId: placeholderId }, data: { fromUserId: userId } });
            await tx.message.updateMany({ where: { toUserId: placeholderId }, data: { toUserId: userId } });
            await tx.chatRoomMember.updateMany({ where: { userId: placeholderId }, data: { userId: userId } });

            // 4. Notes & Remarks
            await tx.studentRemark.updateMany({ where: { teacherId: placeholderId }, data: { teacherId: userId } });
            await tx.internalNote.updateMany({ where: { authorId: placeholderId }, data: { authorId: userId } });

            // 5. System & Assets
            await tx.auditLog.updateMany({ where: { userId: placeholderId }, data: { userId: userId } });
            await tx.bookRequest.updateMany({ where: { userId: placeholderId }, data: { userId: userId } });
            await tx.certificate.updateMany({ where: { issuedById: placeholderId }, data: { issuedById: userId } });
            await tx.resourceProgress.updateMany({ where: { userId: placeholderId }, data: { userId: userId } });

            // 6. Parent/Student relations (wrapped in try-catch as some models might be experimental)
            try {
                const txAny = tx as any;
                if (txAny.absenceAuthorization) await txAny.absenceAuthorization.updateMany({ where: { parentId: placeholderId }, data: { parentId: userId } });
                if (txAny.parentStudentLink) await txAny.parentStudentLink.updateMany({ where: { parentId: placeholderId }, data: { parentId: userId } });
                if (txAny.student) await txAny.student.updateMany({ where: { userId: placeholderId }, data: { userId: userId } });
                if (txAny.event) await txAny.event.updateMany({ where: { createdById: placeholderId }, data: { createdById: userId } });
            } catch (e) {
                console.warn("[Auth Healing] Minor relation migration skipped:", e);
            }

            // Retrieve old user data
            const oldUser = await tx.user.findUnique({ where: { id: placeholderId } });
            if (!oldUser) throw new Error("Source user not found for healing");

            // Delete placeholder
            await tx.user.delete({ where: { id: placeholderId } });

            // Create new user
            return await tx.user.create({
                data: {
                    id: userId,
                    email: oldUser.email,
                    name: oldUser.name,
                    role: oldUser.role,
                    verified: true,
                    schoolId: oldUser.schoolId,
                    teacherCode: oldUser.teacherCode,
                    gender: oldUser.gender,
                    phone: oldUser.phone,
                    qualification: oldUser.qualification,
                    photoUrl: oldUser.photoUrl
                }
            });
        }, {
            maxWait: 15000,
            timeout: 90000
        });

        console.log(`[Auth Healing] Cleanup complete for ${email}. Subscribing to new UUID.`);
        return healedUser;
    } catch (error) {
        console.error(`[Auth Healing] Critical failure during migration for ${email}:`, error);
        throw error;
    }
}
