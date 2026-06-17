import { prisma } from '@/lib/prisma';
import { ChatRoomType, Role } from '@prisma/client';

/**
 * Ensures a user is a member of the default school-wide group chats.
 */
export async function syncGroupMemberships(userId: string, schoolId: string, role: Role) {
    const countBefore = await prisma.chatRoomMember.count({ where: { userId } });

    // 1. Ensure "Global School" group exists — every user is added here
    let schoolRoom = await prisma.chatRoom.findFirst({
        where: { schoolId, type: ChatRoomType.GROUP, name: 'Global School' }
    });

    if (!schoolRoom) {
        // Migrate old names if they exist
        const oldRoom = await prisma.chatRoom.findFirst({
            where: { schoolId, type: ChatRoomType.GROUP, name: { in: ['School Group', 'Whole School'] } }
        });
        if (oldRoom) {
            schoolRoom = await prisma.chatRoom.update({
                where: { id: oldRoom.id },
                data: { name: 'Global School' }
            });
        } else {
            schoolRoom = await prisma.chatRoom.create({
                data: {
                    schoolId,
                    type: ChatRoomType.GROUP,
                    name: 'Global School',
                    metadata: { description: 'General announcements and discussions for everyone in the school.' }
                }
            });
        }
    }

    // Add user to Whole School group
    await prisma.chatRoomMember.upsert({
        where: { chatRoomId_userId: { chatRoomId: schoolRoom.id, userId } },
        update: {},
        create: { chatRoomId: schoolRoom.id, userId }
    });

    // 2. Ensure "Teachers Group" group — teachers, homeroom, principals, owner, superadmin
    if (role === Role.TEACHER || role === Role.HOMEROOM || role === Role.PRINCIPAL || role === Role.OWNER || role === Role.SUPERADMIN) {
        let facultyRoom = await prisma.chatRoom.findFirst({
            where: { schoolId, type: ChatRoomType.GROUP, name: 'Teachers Group' }
        });

        if (!facultyRoom) {
            // Migrate old names if they exist
            const oldRoom = await prisma.chatRoom.findFirst({
                where: { schoolId, type: ChatRoomType.GROUP, name: { in: ['Teachers-Only Group', 'Teachers & Staff'] } }
            });
            if (oldRoom) {
                facultyRoom = await prisma.chatRoom.update({
                    where: { id: oldRoom.id },
                    data: { name: 'Teachers Group' }
                });
            } else {
                facultyRoom = await prisma.chatRoom.create({
                    data: {
                        schoolId,
                        type: ChatRoomType.GROUP,
                        name: 'Teachers Group',
                        metadata: { description: 'Private space for staff coordination and planning.' }
                    }
                });
            }
        }

        await prisma.chatRoomMember.upsert({
            where: { chatRoomId_userId: { chatRoomId: facultyRoom.id, userId } },
            update: {},
            create: { chatRoomId: facultyRoom.id, userId }
        });
    }

    // 3. Ensure "Students" group — students only
    if (role === Role.STUDENT) {
        let studentsRoom = await prisma.chatRoom.findFirst({
            where: { schoolId, type: ChatRoomType.GROUP, name: 'Students' }
        });

        if (!studentsRoom) {
            studentsRoom = await prisma.chatRoom.create({
                data: {
                    schoolId,
                    type: ChatRoomType.GROUP,
                    name: 'Students',
                    metadata: { description: 'Group for all enrolled students.' }
                }
            });
        }

        await prisma.chatRoomMember.upsert({
            where: { chatRoomId_userId: { chatRoomId: studentsRoom.id, userId } },
            update: {},
            create: { chatRoomId: studentsRoom.id, userId }
        });
    }

    // 4. Ensure Class-Specific Groups
    let classIds: string[] = [];

    if (role === Role.TEACHER || role === Role.HOMEROOM) {
        const assignments = await prisma.teacherAssignment.findMany({
            where: { teacherId: userId },
            select: { classId: true }
        });
        classIds = assignments.map(a => a.classId);
    } else if (role === Role.STUDENT) {
        const student = await prisma.student.findUnique({
            where: { userId },
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

    // Process each class chat
    for (const classId of [...new Set(classIds)]) {
        const schoolClass = await prisma.class.findUnique({
            where: { id: classId },
            include: { grade: true }
        });

        if (!schoolClass) continue;

        const chatName = `Class: ${schoolClass.grade.name} ${schoolClass.name}`;

        let classRoom = await prisma.chatRoom.findFirst({
            where: {
                schoolId,
                type: ChatRoomType.GROUP,
                metadata: {
                    path: ['classId'],
                    equals: classId
                }
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
                        description: `Official group for ${chatName}`
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
            console.warn('[syncGroupMemberships] revalidateTag skipped (likely called during render):', e);
        }
    }
}

/**
 * Bulk sync: ensures ALL users in a school are in the correct groups.
 * Call this once to backfill existing users.
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
 * Finds or creates a private 1-on-1 chat room between two users.
 */
export async function getOrCreatePrivateRoom(schoolId: string, userAId: string, userBId: string) {
    // Check if they are already in a private room together
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

    // Create new private room
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
