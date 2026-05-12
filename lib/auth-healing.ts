import { prisma } from '@/lib/prisma';

/**
 * Heals a user ID mismatch by migrating all related records from a placeholder ID (usually numeric or from an old DB)
 * to the new Supabase-provided UUID.
 */
export async function healUserMismatch(placeholderId: string, userId: string, email: string) {
    console.warn(`[Auth Healing] Initiating migration for ${email}. Placeholder: ${placeholderId}, Target: ${userId}`);

    try {
        const healedUser = await prisma.$transaction(async (tx) => {
            // Retrieve old user data
            const oldUser = await tx.user.findUnique({ where: { id: placeholderId } });
            if (!oldUser) throw new Error("Source user not found for healing");

            // 1. Temporarily change the old user's email to avoid unique constraint conflict
            const tempEmail = `migrating_${Date.now()}_${oldUser.email}`;
            await tx.user.update({
                where: { id: placeholderId },
                data: { email: tempEmail }
            });

            // 2. Create the new user with the correct ID and original email
            const newUser = await tx.user.create({
                data: {
                    id: userId,
                    email: email, // The target email
                    name: oldUser.name,
                    role: oldUser.role,
                    verified: true,
                    schoolId: oldUser.schoolId,
                    teacherCode: oldUser.teacherCode,
                    gender: oldUser.gender,
                    phone: oldUser.phone,
                    qualification: oldUser.qualification,
                    photoUrl: oldUser.photoUrl,
                    preferences: oldUser.preferences || undefined
                }
            });

            // 3. Migrate all relations from placeholderId to userId
            // Teacher/Staff related
            await tx.teacherAssignment.updateMany({ where: { teacherId: placeholderId }, data: { teacherId: userId } });
            await tx.timetable.updateMany({ where: { teacherId: placeholderId }, data: { teacherId: userId } });
            await tx.class.updateMany({ where: { homeroomTeacherId: placeholderId }, data: { homeroomTeacherId: userId } });
            await tx.marklistConfig.updateMany({ where: { teacherId: placeholderId }, data: { teacherId: userId } });

            // Content & Grading
            await tx.exam.updateMany({ where: { createdById: placeholderId }, data: { createdById: userId } });
            await tx.exam.updateMany({ where: { lockedById: placeholderId }, data: { lockedById: userId } });
            await tx.lesson.updateMany({ where: { teacherId: placeholderId }, data: { teacherId: userId } });
            await tx.gradeRecord.updateMany({ where: { createdById: placeholderId }, data: { createdById: userId } });
            await tx.attendanceRecord.updateMany({ where: { createdById: placeholderId }, data: { createdById: userId } });
            await tx.attendanceRecord.updateMany({ where: { lockedById: placeholderId }, data: { lockedById: userId } });

            // Communications
            await tx.message.updateMany({ where: { fromUserId: placeholderId }, data: { fromUserId: userId } });
            await tx.message.updateMany({ where: { toUserId: placeholderId }, data: { toUserId: userId } });
            await tx.chatRoomMember.updateMany({ where: { userId: placeholderId }, data: { userId: userId } });

            // Notes & Remarks
            await tx.studentRemark.updateMany({ where: { teacherId: placeholderId }, data: { teacherId: userId } });
            await tx.internalNote.updateMany({ where: { authorId: placeholderId }, data: { authorId: userId } });

            // System & Assets
            await tx.auditLog.updateMany({ where: { userId: placeholderId }, data: { userId: userId } });
            await tx.bookRequest.updateMany({ where: { userId: placeholderId }, data: { userId: userId } });
            await tx.certificate.updateMany({ where: { issuedById: placeholderId }, data: { issuedById: userId } });
            await tx.resourceProgress.updateMany({ where: { userId: placeholderId }, data: { userId: userId } });

            // Multi-Role Relations
            try {
                const txAny = tx as any;
                if (txAny.absenceAuthorization) await txAny.absenceAuthorization.updateMany({ where: { parentId: placeholderId }, data: { parentId: userId } });
                if (txAny.parentStudentLink) await txAny.parentStudentLink.updateMany({ where: { parentId: placeholderId }, data: { parentId: userId } });
                if (txAny.student) await txAny.student.updateMany({ where: { userId: placeholderId }, data: { userId: userId } });
                if (txAny.event) await txAny.event.updateMany({ where: { createdById: placeholderId }, data: { createdById: userId } });
                if (txAny.staffAttendanceRecord) await txAny.staffAttendanceRecord.updateMany({ where: { userId: placeholderId }, data: { userId: userId } });
            } catch (e) {
                console.warn("[Auth Healing] Minor relation migration skipped:", e);
            }

            // 4. Delete the placeholder user
            await tx.user.delete({ where: { id: placeholderId } });

            return newUser;
        },
 {
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
