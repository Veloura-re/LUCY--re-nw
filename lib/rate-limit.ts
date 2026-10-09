import { NextResponse } from 'next/server';
import { rateLimit, secureJson } from '@/lib/security';

/**
 * Cross-instance rate limiting for abuse-prone endpoints (login-adjacent flows, public forms,
 * email senders and AI calls). The in-memory limiter in `@/lib/security` is per isolate, so a
 * caller spread over many isolates multiplies its allowance; this one shares counters.
 *
 * Backends, in order of preference:
 *   1. Upstash Redis REST (UPSTASH_REDIS_REST_URL / KV_REST_API_URL): atomic INCR with expiry.
 *   2. Cloudflare KV (NEXT_INC_CACHE_KV): best effort, reads and writes are not atomic.
 *   3. The in-memory limiter, used when neither is available or a backend call fails.
 * A backend failure never blocks a request; it degrades to the next tier.
 */

type KvNamespaceLike = {
    get(key: string): Promise<string | null>;
    put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
};

const CLOUDFLARE_CONTEXT = Symbol.for('__cloudflare-context__');

function getClientIp(request: Request): string {
    const rawForwarded = request.headers.get('x-forwarded-for');
    const rawIp = request.headers.get('cf-connecting-ip')
        || request.headers.get('x-real-ip')
        || (rawForwarded ? rawForwarded.split(',')[0].trim() : null)
        || 'unknown';
    return rawIp.replace(/^\[?([^\]]+)\]?:[0-9]+$/, '$1').trim();
}

function getKv(): KvNamespaceLike | null {
    const ctx = (globalThis as Record<symbol, any>)[CLOUDFLARE_CONTEXT];
    return ctx?.env?.NEXT_INC_CACHE_KV ?? null;
}

async function incrementUpstash(key: string, windowSeconds: number): Promise<number | null> {
    const baseUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
    if (!baseUrl || !token) return null;

    const res = await fetch(`${baseUrl.replace(/\/$/, '')}/pipeline`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify([['INCR', key], ['EXPIRE', key, windowSeconds, 'NX']]),
    });
    if (!res.ok) return null;

    const out = (await res.json()) as Array<{ result?: number; error?: string }>;
    const count = out?.[0]?.result;
    return typeof count === 'number' ? count : null;
}

async function incrementKv(key: string, windowSeconds: number): Promise<number | null> {
    const kv = getKv();
    if (!kv) return null;

    const current = Number((await kv.get(key)) ?? '0') || 0;
    const next = current + 1;
    // KV requires a minimum TTL of 60 seconds
    await kv.put(key, String(next), { expirationTtl: Math.max(60, windowSeconds) });
    return next;
}

/**
 * Returns a 429 response when the caller is over the limit, otherwise null.
 * Usage: `const limited = await rateLimitShared(req, 'uplink', 3, 10 * 60_000); if (limited) return limited;`
 */
export async function rateLimitShared(
    request: Request,
    endpoint: string,
    maxRequests: number,
    windowMs: number = 60_000
): Promise<NextResponse | null> {
    const ip = getClientIp(request);

    // Development bypass, consistent with the in-memory limiter
    if (ip === '127.0.0.1' || ip === '::1' || ip === 'localhost') return null;

    const windowSeconds = Math.max(1, Math.ceil(windowMs / 1000));
    const bucket = Math.floor(Date.now() / windowMs);
    const key = `rl:${endpoint}:${ip}:${bucket}`;

    try {
        const count = (await incrementUpstash(key, windowSeconds)) ?? (await incrementKv(key, windowSeconds));

        if (count !== null) {
            if (count > maxRequests) {
                const retryAfter = Math.max(1, Math.ceil(((bucket + 1) * windowMs - Date.now()) / 1000));
                const res = secureJson({ error: `Rate limit exceeded. Try again in ${retryAfter}s.` }, 429);
                res.headers.set('Retry-After', String(retryAfter));
                return res;
            }
            return null;
        }
    } catch (e) {
        console.warn('[rate-limit] Shared backend unavailable, using in-memory limiter:', (e as Error).message);
    }

    return rateLimit(request, endpoint, maxRequests, windowMs);
}
