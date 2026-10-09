import { prisma } from '@/lib/prisma';
import { ChatRoomType, Role } from '@prisma/client';

/**
 * Ensures the user exists in Prisma DB before linking to ChatRoomMember or Message.
 */
export async function ensureDbUser(userId: string, email?: string, role: Role = Role.PARENT, schoolId?: string | null) {
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
                    name: 'Campus Member',
                    role: role || Role.PARENT,
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
        console.warn('[ensureDbUser] Error:', e);
        return null;
    }
}

/**
 * Resolves the class IDs that a user is authorized to access.
 * - OWNER, PRINCIPAL, SUPERADMIN: 'ALL' (institutional administrative oversight)
 * - TEACHER, HOMEROOM: only classes where the educator is homeroom teacher, assigned subject teacher, or timetable instructor.
 * - STUDENT: only the class where the student is actively enrolled.
 * - PARENT: only the classes where their verified children are enrolled.
 * - Others: empty array (no class channels).
 */
export async function getUserAccessibleClassIds(
    userId: string,
    schoolId: string,
    userRole?: string
): Promise<string[] | 'ALL'> {
    if (!userId || !schoolId) return [];

    let role = userRole;
    if (!role) {
        const u = await prisma.user.findUnique({
            where: { id: userId },
            select: { role: true }
        });
        role = u?.role || 'PARENT';
    }

    // 1. Leadership has institutional-wide access to all class cohorts
    if (['OWNER', 'PRINCIPAL', 'SUPERADMIN'].includes(role)) {
        return 'ALL';
    }

    // 2. Teachers: Only classes they teach or oversee as homeroom
    if (role === 'TEACHER' || role === 'HOMEROOM') {
        const [homeroomClasses, assignments, timetableSlots] = await Promise.all([
            prisma.class.findMany({
                where: { schoolId, homeroomTeacherId: userId },
                select: { id: true }
            }).catch(() => []),
            prisma.teacherAssignment.findMany({
                where: { teacherId: userId, class: { schoolId } },
                select: { classId: true }
            }).catch(() => []),
            prisma.timetable.findMany({
                where: { teacherId: userId, class: { schoolId } },
                select: { classId: true }
            }).catch(() => [])
        ]);

        const classIds = new Set<string>();
        homeroomClasses.forEach(c => classIds.add(c.id));
        assignments.forEach(a => classIds.add(a.classId));
        timetableSlots.forEach(t => classIds.add(t.classId));

        return Array.from(classIds);
    }

    // 3. Students: Only their enrolled class
    if (role === 'STUDENT') {
        const student = await prisma.student.findFirst({
            where: {
                schoolId,
                OR: [
                    { userId },
                    { id: userId }
                ]
            },
            select: { classId: true }
        }).catch(() => null);

        return student?.classId ? [student.classId] : [];
    }

    // 4. Parents: Only classes where their verified children are enrolled
    if (role === 'PARENT') {
        const links = await prisma.parentStudentLink.findMany({
            where: {
                parentId: userId,
                student: { schoolId }
            },
            select: {
                student: {
                    select: { classId: true }
                }
            }
        }).catch(() => []);

        const classIds = new Set<string>();
        links.forEach(l => {
            if (l.student?.classId) {
                classIds.add(l.student.classId);
            }
        });

        return Array.from(classIds);
    }

    return [];
}

/**
 * Evaluates whether a user is authorized to view, read, or post in a specific ChatRoom.
 */
export async function canUserAccessChatRoom(
    userId: string,
    schoolId: string,
    userRole: string | undefined,
    room: any
): Promise<boolean> {
    if (!room || !userId) return false;

    // Multi-tenant barrier: Room must belong to user's school (unless SUPERADMIN)
    if (room.schoolId && schoolId && room.schoolId !== schoolId && userRole !== 'SUPERADMIN') {
        return false;
    }

    const role = userRole || 'PARENT';
    const staffRoles = ['TEACHER', 'HOMEROOM', 'PRINCIPAL', 'OWNER', 'SUPERADMIN'];

    // 1. Direct Messages (PRIVATE)
    if (room.type === ChatRoomType.PRIVATE || room.type === 'PRIVATE') {
        if (role === 'SUPERADMIN') return true;
        const members = Array.isArray(room.members) ? room.members : [];
        if (members.length > 0) {
            return members.some((m: any) => m.userId === userId);
        }
        const isMember = await prisma.chatRoomMember.findUnique({
            where: { chatRoomId_userId: { chatRoomId: room.id, userId } }
        });
        return Boolean(isMember);
    }

    const meta = (room.metadata as any) || {};
    const category = meta.category;
    const isClassChannel = category === 'CLASS' || Boolean(meta.classId) || (typeof room.name === 'string' && room.name.includes('#class-'));

    // 2. Class Cohort Channels
    if (isClassChannel) {
        let classId: string | null = meta.classId || null;
        if (!classId && meta.slug?.startsWith('class-')) {
            classId = meta.slug.replace(/^class-/, '');
        }

        // If classId is not in metadata, resolve by matching class name in school
        if (!classId && room.name) {
            const normalizedName = room.name.replace(/[^a-zA-Z0-9]/g, ' ').trim();
            const classObj = await prisma.class.findFirst({
                where: {
                    schoolId: room.schoolId || schoolId,
                    name: { contains: normalizedName }
                },
                select: { id: true }
            }).catch(() => null);
            if (classObj) classId = classObj.id;
        }

        const accessibleClassIds = await getUserAccessibleClassIds(userId, schoolId, role);

        if (accessibleClassIds === 'ALL') {
            return true;
        }

        if (!classId) {
            return false;
        }

        return accessibleClassIds.includes(classId);
    }

    // 3. Faculty Lounge / Staff Channels
    if (category === 'FACULTY' || (typeof room.name === 'string' && room.name.includes('faculty'))) {
        return staffRoles.includes(role);
    }

    // 4. Student Commons
    if (category === 'STUDENTS' || (typeof room.name === 'string' && room.name.includes('student-commons'))) {
        return role === 'STUDENT' || staffRoles.includes(role);
    }

    // 5. Universal Campus Broadcasts (Announcements, General)
    if (category === 'CAMPUS' || !category) {
        return true;
    }

    return true;
}

/**
 * Universal School Channel Definition
 */
export interface UniversalChannelDef {
    slug: string;
    name: string;
    description: string;
    icon: string;
    category: 'CAMPUS' | 'FACULTY' | 'STUDENTS' | 'CLASS';
    minRole?: Role[];
}

/**
 * Ensures all universal institutional channels exist for a school.
 */
export async function ensureSchoolChannels(schoolId: string) {
    if (!schoolId) return [];

    try {
        const school = await prisma.school.findUnique({
            where: { id: schoolId },
            select: { id: true, name: true }
        });

        if (!school) return [];

        const schoolName = school.name || 'Campus';

        // 1. Campus Universal Channels
        const defaultChannels: UniversalChannelDef[] = [
            {
                slug: 'announcements',
                name: `#${schoolName.toLowerCase().replace(/\s+/g, '-')}-announcements`,
                description: 'Official campus-wide announcements and alerts from administration.',
                icon: 'megaphone',
                category: 'CAMPUS'
            },
            {
                slug: 'campus-general',
                name: `#${schoolName.toLowerCase().replace(/\s+/g, '-')}-general`,
                description: 'Open discussion and community updates for all school members.',
                icon: 'message',
                category: 'CAMPUS'
            },
            {
                slug: 'faculty-lounge',
                name: '#faculty-and-staff',
                description: 'Private coordination space for teachers, department heads, and leadership.',
                icon: 'briefcase',
                category: 'FACULTY',
                minRole: [Role.TEACHER, Role.HOMEROOM, Role.PRINCIPAL, Role.OWNER, Role.SUPERADMIN]
            },
            {
                slug: 'student-commons',
                name: '#student-commons',
                description: 'Student community space for homework help and campus activities.',
                icon: 'graduation',
                category: 'STUDENTS'
            }
        ];

        for (const def of defaultChannels) {
            let room = await prisma.chatRoom.findFirst({
                where: {
                    schoolId,
                    type: ChatRoomType.GROUP,
                    OR: [
                        { name: def.name },
                        { name: { contains: def.slug } }
                    ]
                }
            });

            if (!room) {
                await prisma.chatRoom.create({
                    data: {
                        schoolId,
                        type: ChatRoomType.GROUP,
                        name: def.name,
                        metadata: {
                            slug: def.slug,
                            category: def.category,
                            description: def.description,
                            icon: def.icon
                        }
                    }
                });
            } else if (room.name !== def.name) {
                await prisma.chatRoom.update({
                    where: { id: room.id },
                    data: { name: def.name }
                }).catch(() => {});
            }
        }

        // 2. Class Cohort Channels
        const classes = await prisma.class.findMany({
            where: { schoolId },
            include: { grade: true }
        });

        for (const cls of classes) {
            const classChannelName = `#class-${(cls.grade?.name || 'grade').toLowerCase().replace(/\s+/g, '-')}-${cls.name.toLowerCase().replace(/\s+/g, '-')}`;
            
            let classRoom = await prisma.chatRoom.findFirst({
                where: {
                    schoolId,
                    type: ChatRoomType.GROUP,
                    OR: [
                        { name: classChannelName },
                        { metadata: { path: ['classId'], equals: cls.id } }
                    ]
                }
            });

            if (!classRoom) {
                await prisma.chatRoom.create({
                    data: {
                        schoolId,
                        type: ChatRoomType.GROUP,
                        name: classChannelName,
                        metadata: {
                            slug: `class-${cls.id}`,
                            classId: cls.id,
                            category: 'CLASS',
                            description: `Official room for Grade ${cls.grade?.level || ''} ${cls.name} students, parents, and teachers.`,
                            icon: 'school'
                        }
                    }
                });
            } else if (classRoom.name !== classChannelName) {
                await prisma.chatRoom.update({
                    where: { id: classRoom.id },
                    data: { name: classChannelName }
                }).catch(() => {});
            }
        }
    } catch (e) {
        console.error('[ensureSchoolChannels] Error:', e);
    }
}

/**
 * Returns structured channels, class cohorts, and direct chats for a user.
 * Filters class cohorts strictly by authorized roles:
 * - Leadership (PRINCIPAL, OWNER, SUPERADMIN): all classes
 * - Teachers: only classes they teach or oversee as homeroom
 * - Students: only their enrolled class
 * - Parents: only classes where their verified children are enrolled
 * - Non-authorized classes are completely hidden.
 */
export async function getStructuredSchoolRooms(userId: string, schoolId: string, role?: string) {
    if (!schoolId) return { campusChannels: [], classCohorts: [], directChats: [], allRooms: [] };

    await ensureSchoolChannels(schoolId);

    try {
        const rooms = await prisma.chatRoom.findMany({
            where: {
                schoolId,
                OR: [
                    { type: ChatRoomType.GROUP },
                    { members: { some: { userId } } }
                ]
            },
            include: {
                members: {
                    include: {
                        user: {
                            select: { id: true, name: true, role: true, photoUrl: true, email: true }
                        }
                    }
                },
                messages: {
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                    include: { fromUser: { select: { id: true, name: true, role: true } } }
                },
                _count: {
                    select: { members: true, messages: true }
                }
            },
            orderBy: [
                { type: 'asc' },
                { updatedAt: 'desc' }
            ]
        });

        // Resolve accessible class IDs for this specific user
        const accessibleClassIds = await getUserAccessibleClassIds(userId, schoolId, role);

        const campusChannels: any[] = [];
        const classCohorts: any[] = [];
        const directChats: any[] = [];

        const staffRoles = ['TEACHER', 'HOMEROOM', 'PRINCIPAL', 'OWNER', 'SUPERADMIN'];

        for (const room of rooms) {
            const meta = (room.metadata as any) || {};
            const isGroup = room.type === ChatRoomType.GROUP;
            const partnerMember = room.members?.find((m: any) => m.userId !== userId);
            const partner = !isGroup ? (partnerMember?.user || { name: 'Direct Contact', role: 'Staff' }) : null;

            // 1. Direct Messages: Must be an authorized participant
            if (!isGroup) {
                const isMember = room.members?.some((m: any) => m.userId === userId);
                if (!isMember && role !== 'SUPERADMIN') {
                    continue;
                }
            }

            // 2. Restrict faculty lounge from parents/students
            if (isGroup && (meta.category === 'FACULTY' || (typeof room.name === 'string' && room.name.includes('faculty')))) {
                if (role && !staffRoles.includes(role)) {
                    continue;
                }
            }

            // 3. Restrict student commons from parents (students and staff only)
            if (isGroup && (meta.category === 'STUDENTS' || (typeof room.name === 'string' && room.name.includes('student-commons')))) {
                if (role === 'PARENT') {
                    continue;
                }
            }

            // 4. Class Cohort Channels: Strictly restrict and hide unauthorized classes
            const isClass = meta.category === 'CLASS' || Boolean(meta.classId) || (typeof room.name === 'string' && room.name.includes('#class-'));
            if (isGroup && isClass) {
                let classId: string | null = meta.classId || null;
                if (!classId && meta.slug?.startsWith('class-')) {
                    classId = meta.slug.replace(/^class-/, '');
                }

                if (accessibleClassIds !== 'ALL') {
                    if (!classId || !accessibleClassIds.includes(classId)) {
                        // User is not authorized to access this class -> hide it completely
                        continue;
                    }
                }
            }

            // Clean room name of any legacy emojis
            const cleanName = !isGroup 
                ? (partner?.name || 'Direct Message') 
                : (room.name ? room.name.replace(/^[\p{Emoji}\p{Extended_Pictographic}\s]+/gu, '').trim() : 'Channel');

            const enriched = {
                ...room,
                name: cleanName,
                slug: meta.slug || room.name?.toLowerCase().replace(/[^a-z0-9]/g, '-') || room.id,
                category: meta.category || (isGroup ? 'CAMPUS' : 'DIRECT'),
                description: meta.description || (isGroup ? 'Institutional channel' : `Direct line with ${partner?.name || 'Contact'} (${partner?.role || 'Staff'})`),
                icon: meta.icon || (isGroup ? 'hash' : 'user'),
                memberCount: room._count?.members || room.members?.length || 1,
                unreadCount: 0,
                lastMessage: room.messages?.[0] || null,
                partner
            };

            if (!isGroup) {
                directChats.push(enriched);
            } else if (isClass) {
                classCohorts.push(enriched);
            } else {
                campusChannels.push(enriched);
            }
        }

        return {
            campusChannels,
            classCohorts,
            directChats,
            allRooms: [...campusChannels, ...classCohorts, ...directChats]
        };
    } catch (e) {
        console.error('[getStructuredSchoolRooms] Error:', e);
        return { campusChannels: [], classCohorts: [], directChats: [], allRooms: [] };
    }
}

/**
 * Finds or creates a direct 1-on-1 private room.
 */
export async function getOrCreateDirectRoom(schoolId: string, userAId: string, userBId: string) {
    const dbUserA = await prisma.user.findFirst({ where: { OR: [{ id: userAId }, { email: userAId }] } });
    const dbUserB = await prisma.user.findFirst({ where: { OR: [{ id: userBId }, { email: userBId }] } });

    const userA = dbUserA || await ensureDbUser(userAId, undefined, Role.PARENT, schoolId);
    const userB = dbUserB || await ensureDbUser(userBId, undefined, Role.TEACHER, schoolId);

    const validAId = userA?.id || userAId;
    const validBId = userB?.id || userBId;

    let existingRoom = await prisma.chatRoom.findFirst({
        where: {
            schoolId,
            type: ChatRoomType.PRIVATE,
            AND: [
                { members: { some: { userId: validAId } } },
                { members: { some: { userId: validBId } } }
            ]
        },
        include: {
            members: {
                include: {
                    user: { select: { id: true, name: true, role: true, photoUrl: true, email: true } }
                }
            },
            messages: {
                orderBy: { createdAt: 'desc' },
                take: 1,
                include: { fromUser: { select: { id: true, name: true, role: true } } }
            },
            _count: {
                select: { members: true, messages: true }
            }
        }
    });

    if (!existingRoom) {
        existingRoom = await prisma.chatRoom.create({
            data: {
                schoolId,
                type: ChatRoomType.PRIVATE,
                members: {
                    create: [
                        { userId: validAId },
                        { userId: validBId }
                    ]
                }
            },
            include: {
                members: {
                    include: {
                        user: { select: { id: true, name: true, role: true, photoUrl: true, email: true } }
                    }
                },
                messages: {
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                    include: { fromUser: { select: { id: true, name: true, role: true } } }
                },
                _count: {
                    select: { members: true, messages: true }
                }
            }
        });
    }

    const partnerMember = existingRoom.members?.find((m: any) => m.userId !== validAId) || existingRoom.members?.find((m: any) => m.userId === validBId);
    const partner = partnerMember?.user || (userB ? { id: userB.id, name: userB.name, role: userB.role, photoUrl: userB.photoUrl } : { name: 'Direct Contact', role: 'Staff' });

    return {
        ...existingRoom,
        name: partner.name || 'Direct Message',
        slug: `dm-${validAId}-${validBId}`,
        category: 'DIRECT',
        description: `Direct line with ${partner.name || 'Contact'} (${partner.role || 'Staff'})`,
        icon: 'user',
        memberCount: existingRoom.members?.length || 2,
        unreadCount: 0,
        lastMessage: existingRoom.messages?.[0] || null,
        partner
    };
}

/**
 * Bulk sync all school members into universal channels.
 */
export async function syncAllSchoolMembers(schoolId: string) {
    if (!schoolId) return;
    await ensureSchoolChannels(schoolId);
}

/**
 * Sync single user group memberships.
 */
export async function syncGroupMemberships(userId: string, schoolId: string, role: Role = Role.OWNER) {
    if (!schoolId) return;
    await ensureSchoolChannels(schoolId);
    await ensureDbUser(userId, undefined, role, schoolId);
}
