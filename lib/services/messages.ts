import { createClient } from '@supabase/supabase-js';

// Helper to get supabase client on Edge
const getSupabase = () => {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
};

/**
 * Fetch all chat rooms (groups and private) for a user within their school.
 * Guaranteed to return all school group channels.
 */
export async function getCachedUserRooms(userId: string, schoolId: string, role?: string) {
    if (!schoolId) return [];

    try {
        const { prisma } = require('@/lib/prisma');

        if (prisma) {
            // Fetch all school groups AND all private rooms the user belongs to
            let rooms = await prisma.chatRoom.findMany({
                where: {
                    schoolId,
                    OR: [
                        { type: 'GROUP' },
                        { members: { some: { userId } } }
                    ]
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
                    },
                    _count: {
                        select: { members: true, messages: true }
                    }
                },
                orderBy: [
                    { type: 'asc' }, // GROUP first
                    { updatedAt: 'desc' }
                ]
            });

            return rooms.map((room: any) => {
                const partnerMember = room.members?.find((m: any) => m.userId !== userId);
                return {
                    ...room,
                    unreadCount: 0,
                    memberCount: room._count?.members || room.members?.length || 1,
                    partner: room.type === 'PRIVATE' ? (partnerMember?.user || { name: 'Direct Contact', role: 'Staff' }) : null
                };
            });
        }
    } catch (e) {
        console.warn('[getCachedUserRooms] Prisma error, falling back to Supabase:', e);
    }

    // Edge/Supabase fallback
    try {
        const supabase = getSupabase();
        
        const { data: fullRooms } = await supabase
            .from('ChatRoom')
            .select('*, members:ChatRoomMember(*, user:User(id, name, role, photoUrl)), messages:Message(*, fromUser:User(name))')
            .eq('schoolId', schoolId)
            .order('updatedAt', { ascending: false });

        return (fullRooms || []).map((room: any) => {
            return {
                ...room,
                unreadCount: 0,
                memberCount: room.members?.length || 1,
                partner: room.type === 'PRIVATE' ? room.members?.find((m: any) => m.userId !== userId)?.user : null,
                messages: (room.messages || []).slice(0, 1)
            };
        });
    } catch (e) {
        console.error('[getCachedUserRooms] Supabase error:', e);
        return [];
    }
}

/**
 * Fetch messages for a specific chat room with cursor pagination.
 */
export async function getCachedRoomMessages(chatRoomId: string, cursor?: string, limit: number = 50) {
    if (!chatRoomId) return { messages: [], nextCursor: null };

    try {
        const { prisma } = require('@/lib/prisma');

        if (prisma) {
            const take = limit || 50;
            const messages = await prisma.message.findMany({
                where: { chatRoomId },
                orderBy: { createdAt: 'desc' },
                take: take + 1,
                cursor: cursor ? { id: cursor } : undefined,
                include: {
                    fromUser: {
                        select: { id: true, name: true, photoUrl: true, role: true }
                    }
                }
            });

            let nextCursor: string | null = null;
            if (messages.length > take) {
                const nextItem = messages.pop();
                nextCursor = nextItem.id;
            }

            return {
                messages: messages.reverse(),
                nextCursor
            };
        }
    } catch (e) {
        console.warn('[getCachedRoomMessages] Prisma error, using Supabase fallback:', e);
    }

    try {
        const supabase = getSupabase();
        const { data: messages } = await supabase
            .from('Message')
            .select('*, fromUser:User(id, name, photoUrl, role)')
            .eq('chatRoomId', chatRoomId)
            .order('createdAt', { ascending: true })
            .limit(limit || 50);

        return {
            messages: messages || [],
            nextCursor: null
        };
    } catch (e) {
        console.error('[getCachedRoomMessages] Supabase error:', e);
        return { messages: [], nextCursor: null };
    }
}
