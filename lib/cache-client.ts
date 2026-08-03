/**
 * Universal Client Cache Store for LUCY
 * Provides in-memory + sessionStorage caching with TTL, auto-timeout, and invalidation.
 */

interface CacheRecord<T> {
    data: T;
    timestamp: number;
    expiresAt: number;
}

const memoryStore = new Map<string, CacheRecord<any>>();

const DEFAULT_TTL_MS = 10 * 60 * 1000; // 10 minutes default
const CACHE_PREFIX = 'lucy_cache_v1_';

/**
 * Retrieve cached item from memory or web storage
 */
export function getClientCache<T>(key: string): T | null {
    const fullKey = `${CACHE_PREFIX}${key}`;
    const now = Date.now();

    // 1. Check in-memory first
    const memItem = memoryStore.get(fullKey);
    if (memItem) {
        if (memItem.expiresAt > now) {
            return memItem.data as T;
        } else {
            memoryStore.delete(fullKey);
        }
    }

    // 2. Check sessionStorage
    if (typeof window !== 'undefined') {
        try {
            const raw = sessionStorage.getItem(fullKey) || localStorage.getItem(fullKey);
            if (raw) {
                const parsed: CacheRecord<T> = JSON.parse(raw);
                if (parsed && parsed.expiresAt > now) {
                    // Populate memory store for instant subsequent reads
                    memoryStore.set(fullKey, parsed);
                    return parsed.data;
                } else {
                    sessionStorage.removeItem(fullKey);
                    localStorage.removeItem(fullKey);
                }
            }
        } catch {
            /* storage access denied or parse error */
        }
    }

    return null;
}

/**
 * Set cached item into memory and sessionStorage (or localStorage if persistToLocal is true)
 */
export function setClientCache<T>(
    key: string,
    data: T,
    ttlMs: number = DEFAULT_TTL_MS,
    persistToLocal: boolean = false
): void {
    const fullKey = `${CACHE_PREFIX}${key}`;
    const now = Date.now();
    const record: CacheRecord<T> = {
        data,
        timestamp: now,
        expiresAt: now + ttlMs
    };

    // Save in memory
    memoryStore.set(fullKey, record);

    // Save in web storage
    if (typeof window !== 'undefined') {
        try {
            const serialized = JSON.stringify(record);
            sessionStorage.setItem(fullKey, serialized);
            if (persistToLocal) {
                localStorage.setItem(fullKey, serialized);
            }
        } catch {
            /* storage full or unavailable */
        }
    }
}

/**
 * Invalidate cache by key or key prefix
 */
export function invalidateClientCache(keyOrPrefix: string): void {
    const fullPrefix = `${CACHE_PREFIX}${keyOrPrefix}`;

    // Clear memory store matching prefix
    for (const k of Array.from(memoryStore.keys())) {
        if (k.startsWith(fullPrefix) || k.includes(keyOrPrefix)) {
            memoryStore.delete(k);
        }
    }

    // Clear web storage matching prefix
    if (typeof window !== 'undefined') {
        try {
            const clearStorage = (storage: Storage) => {
                const keysToRemove: string[] = [];
                for (let i = 0; i < storage.length; i++) {
                    const k = storage.key(i);
                    if (k && (k.startsWith(fullPrefix) || k.includes(keyOrPrefix))) {
                        keysToRemove.push(k);
                    }
                }
                keysToRemove.forEach(k => storage.removeItem(k));
            };

            clearStorage(sessionStorage);
            clearStorage(localStorage);
        } catch {
            /* storage inaccessible */
        }
    }
}

/**
 * Clear all LUCY cached entries
 */
export function clearAllClientCache(): void {
    memoryStore.clear();
    if (typeof window !== 'undefined') {
        try {
            const clearStorage = (storage: Storage) => {
                const keysToRemove: string[] = [];
                for (let i = 0; i < storage.length; i++) {
                    const k = storage.key(i);
                    if (k && k.startsWith(CACHE_PREFIX)) {
                        keysToRemove.push(k);
                    }
                }
                keysToRemove.forEach(k => storage.removeItem(k));
            };
            clearStorage(sessionStorage);
            clearStorage(localStorage);
        } catch {
            /* storage inaccessible */
        }
    }
}

/**
 * Resilient fetch wrapper with built-in AbortController timeout
 */
export async function fetchWithResilience(
    url: string,
    options: RequestInit = {},
    timeoutMs: number = 10000
): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    // If caller provided their own signal, link it
    if (options.signal) {
        options.signal.addEventListener('abort', () => controller.abort());
    }

    try {
        const res = await fetch(url, {
            ...options,
            signal: controller.signal
        });
        return res;
    } finally {
        clearTimeout(timer);
    }
}
