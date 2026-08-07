import { prisma } from '@/lib/prisma';
import { ChatRoomType, Role } from '@prisma/client';

/**
 * Ensures a user is a member of their own school's private group chats.
 * Strictly scoped per school — NO cross-school channels.
 */
export async function syncGroupMemberships(userId: string, schoolId: string, role: Role) {
    if (!schoolId) return;

    const school = await prisma.school.findUnique({
        where: { id: schoolId },
        select: { id: true, name: true }
    });

    if (!school) return;

    const schoolName = school.name || 'School';
    const countBefore = await prisma.chatRoomMember.count({ where: { userId } });

    // 1. Ensure School's Own General Chat exists — strictly for members of THIS school
    const mainChatName = `${schoolName} General`;
    let schoolRoom = await prisma.chatRoom.findFirst({
        where: { 
            schoolId, 
            type: ChatRoomType.GROUP, 
            name: { in: [mainChatName, 'Global School', 'Whole School', 'School Group'] } 
        }
    });

    if (!schoolRoom) {
        schoolRoom = await prisma.chatRoom.create({
            data: {
                schoolId,
                type: ChatRoomType.GROUP,
                name: mainChatName,
                metadata: { description: `Official group for everyone at ${schoolName}.` }
            }
        });
    } else if (schoolRoom.name !== mainChatName) {
        schoolRoom = await prisma.chatRoom.update({
            where: { id: schoolRoom.id },
            data: { name: mainChatName }
        });
    }

    await prisma.chatRoomMember.upsert({
        where: { chatRoomId_userId: { chatRoomId: schoolRoom.id, userId } },
        update: {},
        create: { chatRoomId: schoolRoom.id, userId }
    });

    // 2. Ensure School's Staff & Teachers Group
    if (role === Role.TEACHER || role === Role.HOMEROOM || role === Role.PRINCIPAL || role === Role.OWNER || role === Role.SUPERADMIN) {
        const staffChatName = `${schoolName} Staff & Teachers`;
        let facultyRoom = await prisma.chatRoom.findFirst({
            where: { 
                schoolId, 
                type: ChatRoomType.GROUP, 
                name: { in: [staffChatName, 'Teachers Group', 'Teachers & Staff'] } 
            }
        });

        if (!facultyRoom) {
            facultyRoom = await prisma.chatRoom.create({
                data: {
                    schoolId,
                    type: ChatRoomType.GROUP,
                    name: staffChatName,
                    metadata: { description: `Private space for ${schoolName} staff and faculty.` }
                }
            });
        } else if (facultyRoom.name !== staffChatName) {
            facultyRoom = await prisma.chatRoom.update({
                where: { id: facultyRoom.id },
                data: { name: staffChatName }
            });
        }

        await prisma.chatRoomMember.upsert({
            where: { chatRoomId_userId: { chatRoomId: facultyRoom.id, userId } },
            update: {},
            create: { chatRoomId: facultyRoom.id, userId }
        });
    }

    // 3. Ensure School's Student Group (Students of THIS school only)
    if (role === Role.STUDENT) {
        const studentChatName = `${schoolName} Students`;
        let studentsRoom = await prisma.chatRoom.findFirst({
            where: { 
                schoolId, 
                type: ChatRoomType.GROUP, 
                name: { in: [studentChatName, 'Students Group', 'Students'] } 
            }
        });

        if (!studentsRoom) {
            studentsRoom = await prisma.chatRoom.create({
                data: {
                    schoolId,
                    type: ChatRoomType.GROUP,
                    name: studentChatName,
                    metadata: { description: `Group for all enrolled students at ${schoolName}.` }
                }
            });
        } else if (studentsRoom.name !== studentChatName) {
            studentsRoom = await prisma.chatRoom.update({
                where: { id: studentsRoom.id },
                data: { name: studentChatName }
            });
        }

        await prisma.chatRoomMember.upsert({
            where: { chatRoomId_userId: { chatRoomId: studentsRoom.id, userId } },
            update: {},
            create: { chatRoomId: studentsRoom.id, userId }
        });
    }

    // 4. Ensure Class-Specific Groups within THIS school
    let classIds: string[] = [];

    if (role === Role.OWNER || role === Role.PRINCIPAL || role === Role.SUPERADMIN) {
        const allClasses = await prisma.class.findMany({
            where: { schoolId },
            select: { id: true }
        });
        classIds = allClasses.map(c => c.id);
    } else if (role === Role.TEACHER || role === Role.HOMEROOM) {
        const assignments = await prisma.teacherAssignment.findMany({
            where: { teacherId: userId },
            select: { classId: true }
        });
        classIds = assignments.map(a => a.classId);
        
        if (classIds.length === 0) {
            const allClasses = await prisma.class.findMany({
                where: { schoolId },
                select: { id: true }
            });
            classIds = allClasses.map(c => c.id);
        }
    } else if (role === Role.STUDENT) {
        const student = await prisma.student.findFirst({
            where: { OR: [{ userId }, { id: userId }] },
            select: { classId: true }
        });
        if (student?.classId) classIds = [student.classId];
    } else if (role === Role.PARENT) {
        const parentLinks = await prisma.parentStudentLink.findMany({
            where: { parentId: userId },
            include: { student: { select: { classId: true } } }
        });
        classIds = parentLinks
            .map(l => l.student.classId)
            .filter((id): id is string => !!id);
    }

    // Sync each class chat
    for (const classId of [...new Set(classIds)]) {
        const schoolClass = await prisma.class.findUnique({
            where: { id: classId },
            include: { grade: true }
        });

        if (!schoolClass || schoolClass.schoolId !== schoolId) continue;

        const chatName = `${schoolClass.grade.name} ${schoolClass.name} Class`;

        let classRoom = await prisma.chatRoom.findFirst({
            where: {
                schoolId,
                type: ChatRoomType.GROUP,
                name: chatName
            }
        });

        if (!classRoom) {
            classRoom = await prisma.chatRoom.create({
                data: {
                    schoolId,
                    type: ChatRoomType.GROUP,
                    name: chatName,
                    metadata: {
                        classId,
                        description: `Official group for ${chatName} at ${schoolName}`
                    }
                }
            });
        }

        await prisma.chatRoomMember.upsert({
            where: { chatRoomId_userId: { chatRoomId: classRoom.id, userId } },
            update: {},
            create: { chatRoomId: classRoom.id, userId }
        });
    }

    const countAfter = await prisma.chatRoomMember.count({ where: { userId } });
    if (countAfter > countBefore) {
        try {
            const { revalidateTag } = await import('next/cache');
            const { getUserTag } = await import('@/lib/cache-keys');
            revalidateTag(getUserTag(userId), 'max');
        } catch (e) {
            console.warn('[syncGroupMemberships] revalidateTag skipped:', e);
        }
    }
}

/**
 * Bulk sync: ensures ALL users in a school are in their school's group chats.
 */
export async function syncAllSchoolMembers(schoolId: string) {
    const users = await prisma.user.findMany({
        where: { schoolId },
        select: { id: true, role: true }
    });

    for (const user of users) {
        await syncGroupMemberships(user.id, schoolId, user.role);
    }
}

/**
 * Finds or creates a private 1-on-1 chat room between two users in the SAME school.
 */
export async function getOrCreatePrivateRoom(schoolId: string, userAId: string, userBId: string) {
    const existingRoom = await prisma.chatRoom.findFirst({
        where: {
            schoolId,
            type: ChatRoomType.PRIVATE,
            members: { some: { userId: userAId } },
            AND: {
                members: { some: { userId: userBId } }
            }
        }
    });

    if (existingRoom) return existingRoom;

    return await prisma.chatRoom.create({
        data: {
            schoolId,
            type: ChatRoomType.PRIVATE,
            members: {
                create: [
                    { userId: userAId },
                    { userId: userBId }
                ]
            }
        }
    });
}
