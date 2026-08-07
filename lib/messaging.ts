import { prisma } from '@/lib/prisma';
import { ChatRoomType, Role } from '@prisma/client';

/**
 * Ensures the user exists in Prisma DB before linking to ChatRoomMember or Message.
 */
export async function ensureDbUser(userId: string, email?: string, role: Role = Role.OWNER, schoolId?: string | null) {
    try {
        let user = await prisma.user.findFirst({
            where: {
                OR: [
                    { id: userId },
                    ...(email ? [{ email }] : [])
                ]
            }
        });

        if (!user) {
            user = await prisma.user.create({
                data: {
                    id: userId,
                    email: email || `${userId}@lucy.app`,
                    name: 'School Member',
                    role: role || Role.OWNER,
                    schoolId: schoolId || null,
                    verified: true
                }
            });
        } else if (schoolId && (!user.schoolId || user.schoolId !== schoolId)) {
            user = await prisma.user.update({
                where: { id: user.id },
                data: { schoolId }
            });
        }

        return user;
    } catch (e) {
        console.warn('[ensureDbUser] Error ensuring user:', e);
        return null;
    }
}

/**
 * Completely guaranteed group sync engine for a school.
 * Auto-creates:
 * 1. [School Name] Community Hub (School-wide)
 * 2. [School Name] Faculty & Staff (Staff & Admin)
 * 3. [School Name] Students Hub (All Students)
 * 4. [Grade] [Class] Official Class Group (for every class in the school)
 */
export async function syncGroupMemberships(userId: string, schoolId: string, role: Role = Role.OWNER) {
    if (!schoolId) return;

    try {
        const school = await prisma.school.findUnique({
            where: { id: schoolId },
            select: { id: true, name: true }
        });

        if (!school) return;

        const dbUser = await ensureDbUser(userId, undefined, role, schoolId);
        const resolvedUserId = dbUser?.id || userId;
        const schoolName = school.name || 'School';

        // 1. Ensure [School Name] Community Hub
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
        }

        if (dbUser) {
            await prisma.chatRoomMember.upsert({
                where: { chatRoomId_userId: { chatRoomId: mainRoom.id, userId: resolvedUserId } },
                update: {},
                create: { chatRoomId: mainRoom.id, userId: resolvedUserId }
            }).catch(() => {});
        }

        // 2. Ensure [School Name] Faculty & Teachers Group
        const isStaff = role === Role.TEACHER || role === Role.HOMEROOM || role === Role.PRINCIPAL || role === Role.OWNER || role === Role.SUPERADMIN;
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
        }

        if (isStaff && dbUser) {
            await prisma.chatRoomMember.upsert({
                where: { chatRoomId_userId: { chatRoomId: facultyRoom.id, userId: resolvedUserId } },
                update: {},
                create: { chatRoomId: facultyRoom.id, userId: resolvedUserId }
            }).catch(() => {});
        }

        // 3. Ensure [School Name] Students Hub
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
        }

        if ((role === Role.STUDENT || isStaff) && dbUser) {
            await prisma.chatRoomMember.upsert({
                where: { chatRoomId_userId: { chatRoomId: studentRoom.id, userId: resolvedUserId } },
                update: {},
                create: { chatRoomId: studentRoom.id, userId: resolvedUserId }
            }).catch(() => {});
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

            if (dbUser) {
                await prisma.chatRoomMember.upsert({
                    where: { chatRoomId_userId: { chatRoomId: classRoom.id, userId: resolvedUserId } },
                    update: {},
                    create: { chatRoomId: classRoom.id, userId: resolvedUserId }
                }).catch(() => {});
            }
        }
    } catch (e) {
        console.error('[syncGroupMemberships] Group Sync Error:', e);
    }
}

/**
 * Bulk sync: ensures all users in a school are in their school's group chats.
 */
export async function syncAllSchoolMembers(schoolId: string) {
    try {
        const users = await prisma.user.findMany({
            where: { schoolId },
            select: { id: true, role: true }
        });

        for (const user of users) {
            await syncGroupMemberships(user.id, schoolId, user.role);
        }
    } catch (e) {
        console.error('[syncAllSchoolMembers] Error:', e);
    }
}

/**
 * Finds or creates a private 1-on-1 chat room between two users in the SAME school.
 */
export async function getOrCreatePrivateRoom(schoolId: string, userAId: string, userBId: string) {
    const userA = await ensureDbUser(userAId, undefined, Role.OWNER, schoolId);
    const userB = await ensureDbUser(userBId, undefined, Role.TEACHER, schoolId);

    const validAId = userA?.id || userAId;
    const validBId = userB?.id || userBId;

    const existingRoom = await prisma.chatRoom.findFirst({
        where: {
            schoolId,
            type: ChatRoomType.PRIVATE,
            members: { some: { userId: validAId } },
            AND: {
                members: { some: { userId: validBId } }
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
                    { userId: validAId },
                    { userId: validBId }
                ]
            }
        }
    });
}
