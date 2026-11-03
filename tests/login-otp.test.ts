/**
 * Emailed sign-in codes and trusted devices, against in-memory doubles of the two tables.
 */
type Row = Record<string, any>;
const challenges: Row[] = [];
const devices: Row[] = [];

const matches = (row: Row, where: Row): boolean =>
    Object.entries(where).every(([key, cond]) => {
        const value = row[key];
        if (cond === null) return value === null || value === undefined;
        if (cond && typeof cond === 'object' && !(cond instanceof Date)) {
            if ('lt' in cond) return value < cond.lt;
            if ('gt' in cond) return value > cond.gt;
        }
        return value === cond;
    });

const table = (rows: Row[]) => ({
    create: async ({ data }: any) => { const row = { id: data.id ?? `row-${rows.length}`, attempts: 0, consumedAt: null, createdAt: new Date(), ...data }; rows.push(row); return row; },
    findFirst: async ({ where }: any) => [...rows].reverse().find((r) => matches(r, where)) ?? null,
    count: async ({ where }: any) => rows.filter((r) => matches(r, where)).length,
    deleteMany: async ({ where }: any) => { const keep = rows.filter((r) => !matches(r, where)); const count = rows.length - keep.length; rows.splice(0, rows.length, ...keep); return { count }; },
    updateMany: async ({ where, data }: any) => {
        const hit = rows.filter((r) => matches(r, where));
        hit.forEach((r) => Object.entries(data).forEach(([k, v]: [string, any]) => { r[k] = v && typeof v === 'object' && 'increment' in v ? r[k] + v.increment : v; }));
        return { count: hit.length };
    },
});

jest.mock('@/lib/prisma', () => ({ prisma: { loginChallenge: table(challenges), trustedDevice: table(devices) } }));

import {
    createChallenge, verifyChallenge, isOtpRequiredFor, trustDevice, isTrustedDevice, revokeTrustedDevices, hashCode, MAX_CODE_ATTEMPTS, CODE_TTL_MS,
} from '@/lib/login-otp';

beforeEach(() => { challenges.length = 0; devices.length = 0; delete process.env.LOGIN_OTP_REQUIRED; });

describe('who needs a code', () => {
    test('real addresses do; placeholder addresses and the break-glass switch do not', () => {
        expect(isOtpRequiredFor('teacher@school.edu')).toBe(true);
        expect(isOtpRequiredFor('st-1234@lucy.local')).toBe(false);
        expect(isOtpRequiredFor(null)).toBe(false);
        process.env.LOGIN_OTP_REQUIRED = 'false';
        expect(isOtpRequiredFor('teacher@school.edu')).toBe(false);
    });
});

describe('sign-in code', () => {
    test('is six digits, stored only as a keyed hash, and works once', async () => {
        const { code } = await createChallenge({ userId: 'u1', acceptedTerms: true });
        expect(code).toMatch(/^\d{6}$/);
        expect(challenges[0].codeHash).not.toContain(code);
        expect(challenges[0].codeHash).toBe(await hashCode(challenges[0].id, code));

        expect(await verifyChallenge('u1', code)).toEqual({ ok: true, acceptedTerms: true });
        expect((await verifyChallenge('u1', code)).reason).toBe('NO_CODE');
    });

    test('a wrong code counts an attempt and the limit locks even the right code', async () => {
        const { code } = await createChallenge({ userId: 'u1' });
        const wrong = code === '000000' ? '111111' : '000000';
        for (let i = 0; i < MAX_CODE_ATTEMPTS; i++) expect((await verifyChallenge('u1', wrong)).reason).toBe('INVALID');
        expect((await verifyChallenge('u1', code)).reason).toBe('LOCKED');
    });

    test('expires', async () => {
        const { code } = await createChallenge({ userId: 'u1' });
        challenges[0].expiresAt = new Date(Date.now() - 1);
        expect((await verifyChallenge('u1', code)).reason).toBe('EXPIRED');
        expect(CODE_TTL_MS).toBe(10 * 60_000);
    });

    test('a new code replaces the old one, and another user cannot use it', async () => {
        const first = await createChallenge({ userId: 'u1' });
        const second = await createChallenge({ userId: 'u1' });
        if (first.code !== second.code) expect((await verifyChallenge('u1', first.code)).ok).toBe(false);
        expect((await verifyChallenge('u2', second.code)).reason).toBe('NO_CODE');
        expect((await verifyChallenge('u1', second.code)).ok).toBe(true);
    });
});

describe('code volume', () => {
    test('an account can request only a few codes per hour, whatever the IP', async () => {
        for (let i = 0; i < 8; i++) await createChallenge({ userId: 'u1' });
        await expect(createChallenge({ userId: 'u1' })).rejects.toThrow('TOO_MANY_CODES');
        await expect(createChallenge({ userId: 'u2' })).resolves.toBeTruthy();
    });
});

describe('trusted device', () => {
    test('is bound to the user, stored hashed, and slides on use', async () => {
        const token = await trustDevice('u1', 'jest');
        expect(devices[0].tokenHash).not.toBe(token);
        devices[0].expiresAt = new Date(Date.now() + 60_000);
        expect(await isTrustedDevice('u1', token)).toBe(true);
        expect(devices[0].expiresAt.getTime()).toBeGreaterThan(Date.now() + 29 * 24 * 60 * 60_000);
        expect(await isTrustedDevice('u2', token)).toBe(false);
    });

    test('rejects malformed, unknown and expired tokens', async () => {
        const token = await trustDevice('u1');
        expect(await isTrustedDevice('u1', undefined)).toBe(false);
        expect(await isTrustedDevice('u1', 'not-a-token')).toBe(false);
        expect(await isTrustedDevice('u1', 'a'.repeat(64))).toBe(false);
        devices[0].expiresAt = new Date(Date.now() - 1);
        expect(await isTrustedDevice('u1', token)).toBe(false);
    });

    test('changing the password revokes every device', async () => {
        const token = await trustDevice('u1');
        await trustDevice('u1');
        expect(await revokeTrustedDevices('u1')).toBe(2);
        expect(await isTrustedDevice('u1', token)).toBe(false);
    });
});
