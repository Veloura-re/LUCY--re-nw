import { prisma } from '@/lib/prisma';
import { getStructuredSchoolRooms } from '@/lib/messaging';
import { roomCache } from '@/lib/cache/redis';

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
 * Fetch messages for a specific chat room with cursor pagination and Redis/LRU caching.
 * Caches messages per chatRoomId with 30s TTL and instant invalidation on write.
 */
export async function getCachedRoomMessages(chatRoomId: string, cursor?: string, limit: number = 50) {
    if (!chatRoomId) return { messages: [], nextCursor: null };

    // Check Redis/LRU Cache Tier
    const cached = await roomCache.getRoomMessages(chatRoomId, cursor, limit);
    if (cached) {
        return cached;
    }

    if (!prisma) {
        console.error('[getCachedRoomMessages] prisma is not available');
        return { messages: [], nextCursor: null };
    }

    try {
        const take = Math.min(limit || 50, 200); // cap at 200 to prevent runaway queries
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
            nextCursor = nextItem!.id;
        }

        const result = {
            messages: messages.reverse(),
            nextCursor
        };

        // Cache result for 30s
        await roomCache.setRoomMessages(chatRoomId, result, cursor, limit);

        return result;
    } catch (e) {
        console.error('[getCachedRoomMessages] DB error:', e);
        return { messages: [], nextCursor: null };
    }
}

/**
 * Invalidate cached messages for a chat room on mutation (new message, delete, etc.)
 */
export async function invalidateRoomCache(chatRoomId: string) {
    await roomCache.invalidateRoom(chatRoomId);
}

