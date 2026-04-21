import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
    const { token, userId, name, email } = await request.json();

    // Validate Token again in transaction
    try {
        const result = await prisma.$transaction(async (tx) => {
            const invite = await tx.inviteToken.findUnique({
                where: { token },
            });

            if (!invite || invite.usedAt || invite.expiresAt < new Date()) {
                throw new Error("Invalid Token");
            }

            // Find if a placeholder user exists
            const existingUser = await tx.user.findUnique({
                where: { email: invite.email }
            });

            if (existingUser) {
                // Robust Migration of all User relations
                const placeholderId = existingUser.id;

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

                // 6. Parent/Student relations (Using any cast for potentially unlinked/new types in client)
                try {
                    await (tx as any).absenceAuthorization.updateMany({ where: { parentId: placeholderId }, data: { parentId: userId } });
                    await (tx as any).parentStudentLink.updateMany({ where: { parentId: placeholderId }, data: { parentId: userId } });
                    await (tx as any).student.updateMany({ where: { userId: placeholderId }, data: { userId: userId } });
                    await (tx as any).event.updateMany({ where: { createdById: placeholderId }, data: { createdById: userId } });
                } catch (e) {
                    console.warn("Minor relation migration skipped:", e);
                }

                // Delete the placeholder user
                await tx.user.delete({
                    where: { id: placeholderId }
                });

                // Create the newly authenticated user with preserved metadata
                return await tx.user.create({
                    data: {
                        id: userId, // Match Supabase ID
                        email: invite.email,
                        name,
                        role: invite.role, // Use role from token
                        verified: true,
                        schoolId: invite.schoolId,
                        teacherCode: existingUser.teacherCode,
                        gender: existingUser.gender,
                        phone: existingUser.phone,
                        qualification: existingUser.qualification,
                        photoUrl: existingUser.photoUrl
                    }
                });
            } else {
                // Create User Record completely fresh
                return await tx.user.create({
                    data: {
                        id: userId, // Match Supabase ID
                        email: invite.email,
                        name,
                        role: invite.role,
                        verified: true,
                        schoolId: invite.schoolId,
                    }
                });
            }
        });

        // Post-migration logic: Add to Whole School Chat if schoolId exists
        if (result.schoolId) {
            try {
                // Ensure school is ACTIVE
                await prisma.school.update({
                    where: { id: result.schoolId },
                    data: { status: 'ACTIVE' }
                });

                // Find or Create "Whole School" Chat Room
                let wholeSchoolChat = await prisma.chatRoom.findFirst({
                    where: {
                        schoolId: result.schoolId,
                        name: "Whole School",
                        type: "GROUP"
                    }
                });

                if (!wholeSchoolChat) {
                    wholeSchoolChat = await prisma.chatRoom.create({
                        data: {
                            schoolId: result.schoolId,
                            name: "Whole School",
                            type: "GROUP",
                        }
                    });
                }

                // Add User to Chat Room (using Upsert to be safe)
                await prisma.chatRoomMember.upsert({
                    where: {
                        chatRoomId_userId: {
                            chatRoomId: wholeSchoolChat.id,
                            userId: result.id
                        }
                    },
                    update: {},
                    create: {
                        chatRoomId: wholeSchoolChat.id,
                        userId: result.id
                    }
                });
            } catch (chatError) {
                console.error("Post-registration chat/school update failed:", chatError);
                // Don't fail the whole registration if chat sync fails
            }
        }

        // Burn Token
        await prisma.inviteToken.update({
            where: { token },
            data: { usedAt: new Date() }
        });

        return NextResponse.json({ success: true, userId: result.id });

    } catch (e: any) {
        console.error(e);
        return NextResponse.json({ error: e.message }, { status: 400 });
    }
}
