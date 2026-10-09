import { parseChapaTxRef, verifyChapaTransaction, CHAPA_SUBSCRIPTION_AMOUNT_ETB } from '@/lib/chapa';
import { rateLimitShared } from '@/lib/rate-limit';

const realFetch = global.fetch;
const mockFetch = jest.fn();

beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = mockFetch as any;
    process.env.CHAPA_SECRET_KEY = 'test-secret';
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    delete process.env.KV_REST_API_URL;
    delete process.env.KV_REST_API_TOKEN;
    delete (globalThis as any)[Symbol.for('__cloudflare-context__')];
});

afterAll(() => {
    global.fetch = realFetch;
});

describe('parseChapaTxRef', () => {
    test('extracts a uuid school id that contains dashes', () => {
        const ref = 'tx-123e4567-e89b-12d3-a456-426614174000-1760000000000';
        expect(parseChapaTxRef(ref)).toEqual({ schoolId: '123e4567-e89b-12d3-a456-426614174000', createdAt: 1760000000000 });
    });

    test('rejects malformed references', () => {
        expect(parseChapaTxRef('tx-school')).toBeNull();
        expect(parseChapaTxRef('abc-school-1760000000000')).toBeNull();
        expect(parseChapaTxRef('tx-school-notanumber')).toBeNull();
    });
});

describe('verifyChapaTransaction', () => {
    const ref = 'tx-school1-1760000000000';
    const respond = (status: number, body: any) =>
        mockFetch.mockResolvedValue({ ok: status >= 200 && status < 300, status, json: async () => body });

    test('accepts a paid transaction for the full amount', async () => {
        respond(200, { status: 'success', data: { status: 'success', tx_ref: ref, currency: 'ETB', amount: String(CHAPA_SUBSCRIPTION_AMOUNT_ETB) } });
        await expect(verifyChapaTransaction(ref)).resolves.toEqual({ ok: true });
    });

    test('rejects an underpayment', async () => {
        respond(200, { status: 'success', data: { status: 'success', tx_ref: ref, currency: 'ETB', amount: '10' } });
        await expect(verifyChapaTransaction(ref)).resolves.toEqual({ ok: false, reason: 'AMOUNT_MISMATCH' });
    });

    test('rejects a different currency', async () => {
        respond(200, { status: 'success', data: { status: 'success', tx_ref: ref, currency: 'USD', amount: '99999' } });
        await expect(verifyChapaTransaction(ref)).resolves.toEqual({ ok: false, reason: 'AMOUNT_MISMATCH' });
    });

    test('rejects a reference that does not match the verified transaction', async () => {
        respond(200, { status: 'success', data: { status: 'success', tx_ref: 'tx-other-1760000000000', currency: 'ETB', amount: '9999' } });
        await expect(verifyChapaTransaction(ref)).resolves.toEqual({ ok: false, reason: 'NOT_PAID' });
    });

    test('treats a 4xx as not paid and a 5xx as retryable', async () => {
        respond(404, {});
        await expect(verifyChapaTransaction(ref)).resolves.toEqual({ ok: false, reason: 'NOT_PAID' });
        respond(502, {});
        await expect(verifyChapaTransaction(ref)).resolves.toEqual({ ok: false, reason: 'UNREACHABLE' });
    });

    test('treats a network failure as retryable', async () => {
        mockFetch.mockRejectedValue(new Error('network down'));
        await expect(verifyChapaTransaction(ref)).resolves.toEqual({ ok: false, reason: 'UNREACHABLE' });
    });
});

describe('rateLimitShared', () => {
    const req = (ip: string) => new Request('https://example.com/api/x', { headers: { 'cf-connecting-ip': ip } });

    test('falls back to the in-memory limiter when no shared backend exists', async () => {
        const ip = '203.0.113.10';
        const results = [];
        for (let i = 0; i < 4; i++) results.push(await rateLimitShared(req(ip), 'mem-test', 3));
        expect(results.slice(0, 3).every(r => r === null)).toBe(true);
        expect(results[3]?.status).toBe(429);
        expect(mockFetch).not.toHaveBeenCalled();
    });

    test('uses atomic Upstash counters when configured', async () => {
        process.env.UPSTASH_REDIS_REST_URL = 'https://redis.example.com';
        process.env.UPSTASH_REDIS_REST_TOKEN = 'tok';
        mockFetch
            .mockResolvedValueOnce({ ok: true, json: async () => [{ result: 1 }, { result: 1 }] })
            .mockResolvedValueOnce({ ok: true, json: async () => [{ result: 4 }, { result: 0 }] });

        expect(await rateLimitShared(req('203.0.113.20'), 'upstash-test', 3)).toBeNull();
        const blocked = await rateLimitShared(req('203.0.113.20'), 'upstash-test', 3);
        expect(blocked?.status).toBe(429);
        expect(blocked?.headers.get('Retry-After')).toBeTruthy();
    });

    test('degrades to memory when the shared backend errors, never blocking the request', async () => {
        process.env.UPSTASH_REDIS_REST_URL = 'https://redis.example.com';
        process.env.UPSTASH_REDIS_REST_TOKEN = 'tok';
        mockFetch.mockRejectedValue(new Error('redis unreachable'));

        await expect(rateLimitShared(req('203.0.113.30'), 'degrade-test', 3)).resolves.toBeNull();
    });

    test('uses Cloudflare KV when it is the only backend', async () => {
        const store = new Map<string, string>();
        (globalThis as any)[Symbol.for('__cloudflare-context__')] = {
            env: { NEXT_INC_CACHE_KV: { get: async (k: string) => store.get(k) ?? null, put: async (k: string, v: string) => { store.set(k, v); } } },
        };
        const ip = '203.0.113.40';
        const results = [];
        for (let i = 0; i < 3; i++) results.push(await rateLimitShared(req(ip), 'kv-test', 2));
        expect(results.map(r => r?.status ?? 200)).toEqual([200, 200, 429]);
    });

    test('does not limit localhost during development', async () => {
        for (let i = 0; i < 20; i++) expect(await rateLimitShared(req('127.0.0.1'), 'local-test', 1)).toBeNull();
    });
});
