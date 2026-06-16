import { unstable_cache } from 'next/cache';
import { CACHE_TAGS, getSchoolTag, getUserTag } from '@/lib/cache-keys';
import { createClient } from '@supabase/supabase-js';

// Helper to get supabase client on Edge
const getSupabase = () => {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
};

/**
 * Fetch all chat rooms for a user with persistent caching.
 */
export const getCachedUserRooms = (userId: string, schoolId: string, role: string) => {
    return unstable_cache(
        async () => {
            const { prisma: _prismaCheck } = require('@/lib/prisma');
            const isEdge = !_prismaCheck;

            if (isEdge) {
                const supabase = getSupabase();
                
                // 1. Fetch Rooms where user is a member
                // Note: Complex joins in PostgREST can be tricky
                const { data: rooms } = await supabase
                    .from('ChatRoom')
                    .select('*, members:ChatRoomMember(*, user:User(id, name, role, photoUrl)), messages:Message(*, fromUser:User(name))')
                    .eq('schoolId', schoolId)
                    .eq('members.userId', userId) // This might not work as expected in PostgREST for M2M
                    .order('updatedAt', { ascending: false });

                // Since filtering by members.userId in a select join is tricky in PostgREST,
                // we might need to fetch member room IDs first.
                const { data: userMemberRooms } = await supabase
                    .from('ChatRoomMember')
                    .select('chatRoomId')
                    .eq('userId', userId);
                
                const roomIds = (userMemberRooms || []).map(r => r.chatRoomId);
                if (roomIds.length === 0) return [];

                const { data: fullRooms } = await supabase
                    .from('ChatRoom')
                    .select('*, members:ChatRoomMember(*, user:User(id, name, role, photoUrl)), messages:Message(*, fromUser:User(name))')
                    .in('id', roomIds)
                    .order('updatedAt', { ascending: false });

                return (fullRooms || []).map((room: any) => {
                    // Simplify for Edge
                    return {
                        ...room,
                        unreadCount: 0,
                        partner: room.type === 'PRIVATE' ? room.members.find((m: any) => m.userId !== userId)?.user : null,
                        messages: (room.messages || []).slice(0, 1)
                    };
                });
            }

            // Node.js Prisma Fallback
            const { prisma } = require('@/lib/prisma');
            const { ChatRoomType, Prisma } = require('@prisma/client');
            
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

            const partnersToHydrate: string[] = [];
            rooms.forEach((room: any) => {
                if (room.type === 'PRIVATE') {
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

            const parentToChildrenMap = new Map<string, string[]>();
            parentLinks.forEach(link => {
                const existing = parentToChildrenMap.get(link.parentId) || [];
                parentToChildrenMap.set(link.parentId, [...existing, link.student.firstName]);
            });

            const roomsWithMeta = rooms.map((room: any) => {
                const unreadCount = unreadCountMap.get(room.id) ?? 0;
                let partner = null;

                if (room.type === 'PRIVATE') {
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
            revalidate: 30
        }
    )();
};

/**
 * Fetch messages for a specific room with caching and pagination support.
 */
export const getCachedRoomMessages = (chatRoomId: string, cursor?: string, limit = 50) => {
    return unstable_cache(
        async () => {
            const { prisma: _prismaCheck } = require('@/lib/prisma');
            const isEdge = !_prismaCheck;

            if (isEdge) {
                const supabase = getSupabase();
                let query = supabase
                    .from('Message')
                    .select('*, fromUser:User(id, name, role, photoUrl)')
                    .eq('chatRoomId', chatRoomId)
                    .order('createdAt', { ascending: false })
                    .limit(limit + 1);
                
                if (cursor) {
                    // Note: Cursor pagination in PostgREST is different, usually using ID comparison
                    // Here we'll just skip it for now or implement a basic version
                }

                const { data: messages } = await query;
                const items = messages || [];
                const hasMore = items.length > limit;
                const resultItems = hasMore ? items.slice(0, limit) : items;
                const nextCursor = hasMore ? resultItems[resultItems.length - 1].id : null;

                return {
                    messages: resultItems.reverse(),
                    nextCursor
                };
            }

            // Node.js Prisma Fallback
            const { prisma } = require('@/lib/prisma');
            const messages = await prisma.message.findMany({
                where: { chatRoomId },
                include: { fromUser: { select: { id: true, name: true, role: true, photoUrl: true } } },
                orderBy: { createdAt: 'desc' },
                take: limit + 1,
                ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {})
            });

            const hasMore = messages.length > limit;
            const items = hasMore ? messages.slice(0, limit) : messages;
            const nextCursor = hasMore ? items[items.length - 1].id : null;

            return {
                messages: items.reverse(),
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
