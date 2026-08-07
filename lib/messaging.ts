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
                name: `📢 #${schoolName.toLowerCase().replace(/\s+/g, '-')}-announcements`,
                description: `Official campus-wide announcements and alerts from administration.`,
                icon: 'megaphone',
                category: 'CAMPUS'
            },
            {
                slug: 'campus-general',
                name: `💬 #${schoolName.toLowerCase().replace(/\s+/g, '-')}-general`,
                description: `Open discussion and community updates for all school members.`,
                icon: 'message',
                category: 'CAMPUS'
            },
            {
                slug: 'faculty-lounge',
                name: `💼 #faculty-and-staff`,
                description: `Private coordination space for teachers, department heads, and leadership.`,
                icon: 'briefcase',
                category: 'FACULTY',
                minRole: [Role.TEACHER, Role.HOMEROOM, Role.PRINCIPAL, Role.OWNER, Role.SUPERADMIN]
            },
            {
                slug: 'student-commons',
                name: `🎓 #student-commons`,
                description: `Student community space for homework help and campus activities.`,
                icon: 'graduation',
                category: 'STUDENTS'
            }
        ];

        for (const def of defaultChannels) {
            let room = await prisma.chatRoom.findFirst({
                where: {
                    schoolId,
                    type: ChatRoomType.GROUP,
                    name: def.name
                }
            });

            if (!room) {
                // Also check by slug in metadata
                room = await prisma.chatRoom.findFirst({
                    where: {
                        schoolId,
                        type: ChatRoomType.GROUP,
                        name: { contains: def.slug }
                    }
                });
            }

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
            }
        }

        // 2. Class Cohort Channels
        const classes = await prisma.class.findMany({
            where: { schoolId },
            include: { grade: true }
        });

        for (const cls of classes) {
            const classChannelName = `🏫 #class-${(cls.grade?.name || 'grade').toLowerCase().replace(/\s+/g, '-')}-${cls.name.toLowerCase().replace(/\s+/g, '-')}`;
            
            let classRoom = await prisma.chatRoom.findFirst({
                where: {
                    schoolId,
                    type: ChatRoomType.GROUP,
                    name: classChannelName
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
            }
        }
    } catch (e) {
        console.error('[ensureSchoolChannels] Error:', e);
    }
}

/**
 * Returns structured channels, class cohorts, and direct chats for a user.
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

        const campusChannels: any[] = [];
        const classCohorts: any[] = [];
        const directChats: any[] = [];

        const staffRoles = ['TEACHER', 'HOMEROOM', 'PRINCIPAL', 'OWNER', 'SUPERADMIN'];

        for (const room of rooms) {
            const meta = (room.metadata as any) || {};
            const isGroup = room.type === ChatRoomType.GROUP;
            const partnerMember = room.members?.find((m: any) => m.userId !== userId);
            const partner = !isGroup ? (partnerMember?.user || { name: 'Direct Contact', role: 'Staff' }) : null;

            // Restrict faculty lounge from parents/students
            if (isGroup && (meta.category === 'FACULTY' || room.name?.includes('faculty'))) {
                if (role && !staffRoles.includes(role)) {
                    continue;
                }
            }

            const enriched = {
                ...room,
                name: !isGroup ? (partner?.name || 'Direct Message') : room.name,
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
            } else if (meta.category === 'CLASS' || room.name?.includes('#class-')) {
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
