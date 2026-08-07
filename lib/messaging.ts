import { prisma } from '@/lib/prisma';
import { ChatRoomType, Role } from '@prisma/client';

/**
 * Completely guaranteed group sync engine for a school.
 * Auto-creates and auto-joins:
 * 1. [School Name] Community Hub (School-wide)
 * 2. [School Name] Faculty & Teachers (Staff & Admin)
 * 3. [School Name] Students Hub (All Students)
 * 4. [Grade] [Class] Official Class Group (for every class in the school)
 */
export async function syncGroupMemberships(userId: string, schoolId: string, role: Role) {
    if (!schoolId) return;

    try {
        const school = await prisma.school.findUnique({
            where: { id: schoolId },
            select: { id: true, name: true }
        });

        if (!school) return;

        const schoolName = school.name || 'School';

        // 1. Ensure [School Name] Community Hub (Every single user in the school belongs here)
        const mainGroupName = `${schoolName} Community Hub`;
        let mainRoom = await prisma.chatRoom.findFirst({
            where: {
                schoolId,
                type: ChatRoomType.GROUP,
                name: { in: [mainGroupName, `${schoolName} General`, 'Global School', 'Whole School', 'School Group'] }
            }
        });

        if (!mainRoom) {
            mainRoom = await prisma.chatRoom.create({
                data: {
                    schoolId,
                    type: ChatRoomType.GROUP,
                    name: mainGroupName,
                    metadata: { description: `Official campus-wide announcements and discussion for ${schoolName}.` }
                }
            });
        } else if (mainRoom.name !== mainGroupName) {
            mainRoom = await prisma.chatRoom.update({
                where: { id: mainRoom.id },
                data: { name: mainGroupName }
            });
        }

        await prisma.chatRoomMember.upsert({
            where: { chatRoomId_userId: { chatRoomId: mainRoom.id, userId } },
            update: {},
            create: { chatRoomId: mainRoom.id, userId }
        });

        // 2. Ensure [School Name] Faculty & Teachers Group
        const isStaff = role === Role.TEACHER || role === Role.HOMEROOM || role === Role.PRINCIPAL || role === Role.OWNER || role === Role.SUPERADMIN;
        if (isStaff) {
            const facultyGroupName = `${schoolName} Faculty & Staff`;
            let facultyRoom = await prisma.chatRoom.findFirst({
                where: {
                    schoolId,
                    type: ChatRoomType.GROUP,
                    name: { in: [facultyGroupName, `${schoolName} Staff & Teachers`, 'Teachers Group', 'Teachers & Staff'] }
                }
            });

            if (!facultyRoom) {
                facultyRoom = await prisma.chatRoom.create({
                    data: {
                        schoolId,
                        type: ChatRoomType.GROUP,
                        name: facultyGroupName,
                        metadata: { description: `Private workspace for ${schoolName} faculty, teachers, and leadership.` }
                    }
                });
            } else if (facultyRoom.name !== facultyGroupName) {
                facultyRoom = await prisma.chatRoom.update({
                    where: { id: facultyRoom.id },
                    data: { name: facultyGroupName }
                });
            }

            await prisma.chatRoomMember.upsert({
                where: { chatRoomId_userId: { chatRoomId: facultyRoom.id, userId } },
                update: {},
                create: { chatRoomId: facultyRoom.id, userId }
            });
        }

        // 3. Ensure [School Name] Students Hub
        if (role === Role.STUDENT || role === Role.OWNER || role === Role.PRINCIPAL || role === Role.SUPERADMIN) {
            const studentGroupName = `${schoolName} Students Hub`;
            let studentRoom = await prisma.chatRoom.findFirst({
                where: {
                    schoolId,
                    type: ChatRoomType.GROUP,
                    name: { in: [studentGroupName, `${schoolName} Students`, 'Students Group', 'Students'] }
                }
            });

            if (!studentRoom) {
                studentRoom = await prisma.chatRoom.create({
                    data: {
                        schoolId,
                        type: ChatRoomType.GROUP,
                        name: studentGroupName,
                        metadata: { description: `Official channel for all enrolled students at ${schoolName}.` }
                    }
                });
            } else if (studentRoom.name !== studentGroupName) {
                studentRoom = await prisma.chatRoom.update({
                    where: { id: studentRoom.id },
                    data: { name: studentGroupName }
                });
            }

            await prisma.chatRoomMember.upsert({
                where: { chatRoomId_userId: { chatRoomId: studentRoom.id, userId } },
                update: {},
                create: { chatRoomId: studentRoom.id, userId }
            });
        }

        // 4. Ensure All School Class Groups
        const allClasses = await prisma.class.findMany({
            where: { schoolId },
            include: { grade: true }
        });

        for (const cls of allClasses) {
            const classGroupName = `Class: Grade ${cls.grade?.level || cls.grade?.name || ''} ${cls.name}`;

            let classRoom = await prisma.chatRoom.findFirst({
                where: {
                    schoolId,
                    type: ChatRoomType.GROUP,
                    name: { in: [classGroupName, `${cls.grade?.name || ''} ${cls.name} Class`] }
                }
            });

            if (!classRoom) {
                classRoom = await prisma.chatRoom.create({
                    data: {
                        schoolId,
                        type: ChatRoomType.GROUP,
                        name: classGroupName,
                        metadata: {
                            classId: cls.id,
                            description: `Official class room for Grade ${cls.grade?.level || ''} ${cls.name}`
                        }
                    }
                });
            }

            // Auto-join staff, homeroom, principals, and owners to all classes; students to their assigned class
            let shouldJoin = isStaff;
            if (!shouldJoin && role === Role.STUDENT) {
                const student = await prisma.student.findFirst({
                    where: { OR: [{ userId }, { id: userId }] },
                    select: { classId: true }
                });
                if (student?.classId === cls.id) shouldJoin = true;
            } else if (!shouldJoin && role === Role.PARENT) {
                const parentLinks = await prisma.parentStudentLink.findMany({
                    where: { parentId: userId },
                    include: { student: { select: { classId: true } } }
                });
                if (parentLinks.some(l => l.student?.classId === cls.id)) shouldJoin = true;
            }

            if (shouldJoin) {
                await prisma.chatRoomMember.upsert({
                    where: { chatRoomId_userId: { chatRoomId: classRoom.id, userId } },
                    update: {},
                    create: { chatRoomId: classRoom.id, userId }
                });
            }
        }
    } catch (e) {
        console.error('[syncGroupMemberships] Group Sync Error:', e);
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
