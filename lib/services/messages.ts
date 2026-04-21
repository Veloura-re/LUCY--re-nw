import { prisma } from '@/lib/prisma';
import { unstable_cache } from 'next/cache';
import { CACHE_TAGS, getSchoolTag, getUserTag } from '@/lib/cache-keys';
import { ChatRoomType, Prisma } from '@prisma/client';

/**
 * Fetch all chat rooms for a user with persistent caching.
 * Includes optimized batch querying for unread counts.
 */
export const getCachedUserRooms = (userId: string, schoolId: string, role: string) => {
    return unstable_cache(
        async () => {
            console.log(`[lib/services/messages] Cache MISS for user rooms: ${userId}`);
            
            // 1. Fetch Rooms & Members in a single efficient query
            const rooms = await prisma.chatRoom.findMany({
                where: {
                    schoolId,
                    members: { some: { userId } }
                },
                include: {
                    members: {
                        include: {
                            user: {
                                select: { id: true, name: true, role: true, photoUrl: true }
                            }
                        }
                    },
                    messages: {
                        orderBy: { createdAt: 'desc' },
                        take: 1,
                        include: { fromUser: { select: { name: true } } }
                    }
                },
                orderBy: { updatedAt: 'desc' }
            });

            const roomIds = rooms.map(r => r.id);
            if (roomIds.length === 0) return [];

            // 2. BATCH Unread Counts via Raw SQL for maximum performance
            // This replaces the N+1 loop with a single JOIN query.
            const unreadCounts = await prisma.$queryRaw<any[]>`
                SELECT m."chatRoomId", COUNT(*)::int as count
                FROM "Message" m
                JOIN "ChatRoomMember" crm ON m."chatRoomId" = crm."chatRoomId"
                WHERE crm."userId" = ${userId}
                AND m."createdAt" > crm."lastReadAt"
                AND m."chatRoomId" IN (${Prisma.join(roomIds)})
                GROUP BY m."chatRoomId"
            `;

            const unreadCountMap = new Map<string, number>(
                unreadCounts.map(uc => [uc.chatRoomId, uc.count])
            );

            // 3. BATCH Parent Metadata: Collect all partners who are parents
            const partnersToHydrate: string[] = [];
            rooms.forEach((room: any) => {
                if (room.type === ChatRoomType.PRIVATE) {
                    const partnerMember = room.members.find((m: any) => m.userId !== userId);
                    if (partnerMember?.user?.role === 'PARENT' && role !== 'PARENT' && role !== 'STUDENT') {
                        partnersToHydrate.push(partnerMember.user.id);
                    }
                }
            });

            const parentLinks = partnersToHydrate.length > 0 
                ? await prisma.parentStudentLink.findMany({
                    where: { parentId: { in: partnersToHydrate } },
                    include: { student: { select: { firstName: true } } }
                })
                : [];

            // Group links by parentId
            const parentToChildrenMap = new Map<string, string[]>();
            parentLinks.forEach(link => {
                const existing = parentToChildrenMap.get(link.parentId) || [];
                parentToChildrenMap.set(link.parentId, [...existing, link.student.firstName]);
            });

            // 4. Final Meta Construction
            const roomsWithMeta = rooms.map((room: any) => {
                const unreadCount = unreadCountMap.get(room.id) ?? 0;
                let partner = null;

                if (room.type === ChatRoomType.PRIVATE) {
                    const partnerMember = room.members.find((m: any) => m.userId !== userId);
                    partner = partnerMember?.user ? { ...partnerMember.user } : null;

                    if (partner && parentToChildrenMap.has(partner.id)) {
                        const childNames = parentToChildrenMap.get(partner.id)!.join(', ');
                        partner.name = `${childNames}'s Parent (${partner.name})`;
                    }
                }

                return { ...room, unreadCount, partner };
            });

            return roomsWithMeta;
        },
        [getUserTag(userId), 'user-rooms'],
        {
            tags: [getSchoolTag(CACHE_TAGS.MESSAGES, schoolId), getUserTag(userId)],
            revalidate: 30 // SWR: Check for fresh items every 30s
        }
    )();
};

/**
 * Fetch messages for a specific room with caching and pagination support.
 */
export const getCachedRoomMessages = (chatRoomId: string, cursor?: string, limit = 50) => {
    return unstable_cache(
        async () => {
            console.log(`[lib/services/messages] Cache MISS for messages in room: ${chatRoomId}`);
            
            const messages = await prisma.message.findMany({
                where: { chatRoomId },
                include: { fromUser: { select: { id: true, name: true, role: true, photoUrl: true } } },
                orderBy: { createdAt: 'desc' },
                take: limit + 1, // Take extra for cursor detection
                ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {})
            });

            const hasMore = messages.length > limit;
            const items = hasMore ? messages.slice(0, limit) : messages;
            const nextCursor = hasMore ? items[items.length - 1].id : null;

            return {
                messages: items.reverse(), // Traditional chronological order for UI
                nextCursor
            };
        },
        [`room-messages-${chatRoomId}-${cursor || 'latest'}`],
        {
            tags: [`room-messages-${chatRoomId}`],
            revalidate: 30
        }
    )();
};
