/**
 * ⚡ High-Performance Multi-Tier Redis & In-Memory Cache Manager
 * 
 * Supports:
 * 1. Upstash Redis / Vercel KV REST API (Zero binary dependencies, fully serverless & Edge ready)
 * 2. In-Memory LRU Cache with TTL and tag invalidation fallback for local dev / cold-start resilience
 */

interface CacheEntry<T> {
    data: T;
    expiresAt: number;
}

class InMemoryLruCache {
    private cache = new Map<string, CacheEntry<any>>();
    private readonly maxSize: number;

    constructor(maxSize = 1000) {
        this.maxSize = maxSize;
    }

    get<T>(key: string): T | null {
        const entry = this.cache.get(key);
        if (!entry) return null;

        if (Date.now() > entry.expiresAt) {
            this.cache.delete(key);
            return null;
        }

        // Refresh position for LRU
        this.cache.delete(key);
        this.cache.set(key, entry);
        return entry.data as T;
    }

    set<T>(key: string, data: T, ttlSeconds: number): void {
        if (this.cache.size >= this.maxSize) {
            // Evict oldest entry
            const oldestKey = this.cache.keys().next().value;
            if (oldestKey) this.cache.delete(oldestKey);
        }

        this.cache.set(key, {
            data,
            expiresAt: Date.now() + ttlSeconds * 1000,
        });
    }

    del(key: string): void {
        this.cache.delete(key);
    }

    delPattern(prefix: string): void {
        for (const key of this.cache.keys()) {
            if (key.startsWith(prefix)) {
                this.cache.delete(key);
            }
        }
    }

    clear(): void {
        this.cache.clear();
    }
}

const memoryCache = new InMemoryLruCache(2000);

// Global Redis REST Client configuration
const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

async function executeRedisCommand<T = any>(command: string, ...args: (string | number)[]): Promise<T | null> {
    if (!UPSTASH_URL || !UPSTASH_TOKEN) return null;

    try {
        const url = `${UPSTASH_URL.replace(/\/$/, '')}/${command}/${args.map(a => encodeURIComponent(String(a))).join('/')}`;
        const res = await fetch(url, {
            headers: {
                Authorization: `Bearer ${UPSTASH_TOKEN}`,
            },
            // Fast timeout to avoid blocking requests if Redis is unreachable
            signal: AbortSignal.timeout(1500),
        });

        if (!res.ok) return null;
        const data = await res.json();
        return data.result;
    } catch {
        return null;
    }
}

export const redisCache = {
    /**
     * Retrieve item from cache (checks Redis first, falls back to in-memory)
     */
    async get<T>(key: string): Promise<T | null> {
        // Check in-memory fast tier first
        const memHit = memoryCache.get<T>(key);
        if (memHit !== null) return memHit;

        // If Redis is configured, check Redis
        if (UPSTASH_URL && UPSTASH_TOKEN) {
            try {
                const redisHit = await executeRedisCommand<string>('get', key);
                if (redisHit) {
                    const parsed = JSON.parse(redisHit) as T;
                    // Populate local memory cache for subsequent instant reads
                    memoryCache.set(key, parsed, 15);
                    return parsed;
                }
            } catch {
                // Ignore parse/fetch errors and fall through
            }
        }

        return null;
    },

    /**
     * Store item in cache with TTL (seconds)
     */
    async set<T>(key: string, value: T, ttlSeconds: number = 30): Promise<void> {
        // Store in local memory cache
        memoryCache.set(key, value, ttlSeconds);

        // Store in Redis if configured
        if (UPSTASH_URL && UPSTASH_TOKEN) {
            try {
                const serialized = JSON.stringify(value);
                await executeRedisCommand('setex', key, ttlSeconds, serialized);
            } catch {
                // Non-blocking fallback
            }
        }
    },

    /**
     * Invalidate specific key
     */
    async del(key: string): Promise<void> {
        memoryCache.del(key);
        if (UPSTASH_URL && UPSTASH_TOKEN) {
            try {
                await executeRedisCommand('del', key);
            } catch {
                // Non-blocking
            }
        }
    },

    /**
     * Invalidate all keys matching a prefix pattern
     */
    async delPattern(prefix: string): Promise<void> {
        memoryCache.delPattern(prefix);

        if (UPSTASH_URL && UPSTASH_TOKEN) {
            try {
                const keys = await executeRedisCommand<string[]>('keys', `${prefix}*`);
                if (Array.isArray(keys) && keys.length > 0) {
                    await Promise.all(keys.map(k => executeRedisCommand('del', k)));
                }
            } catch {
                // Non-blocking
            }
        }
    },
};

/**
 * High-Traffic Room Cache Helpers
 */
export const roomCache = {
    getKey(chatRoomId: string, cursor?: string, limit: number = 50): string {
        return `msg_room:${chatRoomId}:${cursor || 'latest'}:${limit}`;
    },

    async getRoomMessages(chatRoomId: string, cursor?: string, limit: number = 50) {
        const key = roomCache.getKey(chatRoomId, cursor, limit);
        return await redisCache.get<{ messages: any[]; nextCursor: string | null }>(key);
    },

    async setRoomMessages(chatRoomId: string, data: { messages: any[]; nextCursor: string | null }, cursor?: string, limit: number = 50) {
        const key = roomCache.getKey(chatRoomId, cursor, limit);
        // 30 seconds TTL for message rooms
        await redisCache.set(key, data, 30);
    },

    async invalidateRoom(chatRoomId: string) {
        await redisCache.delPattern(`msg_room:${chatRoomId}:`);
    },
};
