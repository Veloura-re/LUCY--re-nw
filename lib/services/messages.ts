import { createClient } from '@supabase/supabase-js';
import { getStructuredSchoolRooms } from '@/lib/messaging';

// Helper to get supabase client on Edge
const getSupabase = () => {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
};

/**
 * Direct fetch for structured chat channels (Campus, Classes, Direct).
 */
export async function getCachedStructuredRooms(userId: string, schoolId: string, role?: string) {
    if (!schoolId) return { campusChannels: [], classCohorts: [], directChats: [], allRooms: [] };
    return await getStructuredSchoolRooms(userId, schoolId, role);
}

/**
 * Fetch all chat rooms for a user.
 */
export async function getCachedUserRooms(userId: string, schoolId: string, role?: string) {
    if (!schoolId) return [];
    const structured = await getStructuredSchoolRooms(userId, schoolId, role);
    return structured.allRooms;
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
