import { createClient } from '@supabase/supabase-js';

// Helper to get supabase client on Edge
const getSupabase = () => {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
};

/**
 * Direct fetch for chat rooms for a user (ensures instant group visibility).
 */
export async function getCachedUserRooms(userId: string, schoolId: string, role: string) {
    if (!schoolId) return [];

    try {
        const { prisma } = require('@/lib/prisma');

        if (prisma) {
            // Node.js Prisma query
            let rooms = await prisma.chatRoom.findMany({
                where: {
                    schoolId,
                    OR: [
                        { members: { some: { userId } } },
                        { type: 'GROUP' }
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
                    }
                },
                orderBy: { updatedAt: 'desc' }
            });

            return rooms.map((room: any) => {
                const partnerMember = room.members?.find((m: any) => m.userId !== userId);
                return {
                    ...room,
                    unreadCount: 0,
                    partner: room.type === 'PRIVATE' ? partnerMember?.user : null
                };
            });
        }
    } catch (e) {
        console.warn('[getCachedUserRooms] Prisma query error, falling back to Supabase:', e);
    }

    // Edge/Supabase fallback
    try {
        const supabase = getSupabase();
        
        const { data: userMemberRooms } = await supabase
            .from('ChatRoomMember')
            .select('chatRoomId')
            .eq('userId', userId);
        
        const roomIds = (userMemberRooms || []).map(r => r.chatRoomId);

        const { data: fullRooms } = await supabase
            .from('ChatRoom')
            .select('*, members:ChatRoomMember(*, user:User(id, name, role, photoUrl)), messages:Message(*, fromUser:User(name))')
            .eq('schoolId', schoolId)
            .order('updatedAt', { ascending: false });

        return (fullRooms || []).filter((room: any) => room.type === 'GROUP' || roomIds.includes(room.id)).map((room: any) => {
            return {
                ...room,
                unreadCount: 0,
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
export async function getCachedRoomMessages(chatRoomId: string, cursor?: string) {
    if (!chatRoomId) return { messages: [], nextCursor: null };

    try {
        const { prisma } = require('@/lib/prisma');

        if (prisma) {
            const take = 30;
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
            .limit(50);

        return {
            messages: messages || [],
            nextCursor: null
        };
    } catch (e) {
        console.error('[getCachedRoomMessages] Supabase error:', e);
        return { messages: [], nextCursor: null };
    }
}
