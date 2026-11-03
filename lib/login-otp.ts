import { prisma } from '@/lib/prisma';
import { safeEqual, secureRandomInt } from '@/lib/security';
import { getHmacSecret } from '@/lib/device-mark';

export const CODE_TTL_MS = 10 * 60_000;
export const MAX_CODE_ATTEMPTS = 5;
export const TRUST_DAYS = 30;
const MAX_CODES_PER_HOUR = 8;
export const TRUSTED_COOKIE = 'lucy_trusted_device';
const TRUST_MS = TRUST_DAYS * 24 * 60 * 60_000;

/**
 * Who gets the emailed code: everyone with a real address. Students who registered by code only
 * have a placeholder address that cannot receive mail, so they stay password-only.
 * LOGIN_OTP_REQUIRED=false is a break-glass switch for an email outage, not a setting to leave off.
 */
export function isOtpRequiredFor(email: string | null | undefined): boolean {
    if (process.env.LOGIN_OTP_REQUIRED === 'false') return false;
    return Boolean(email) && !email!.toLowerCase().endsWith('@lucy.local');
}

function getSecret(): string {
    const secret = getHmacSecret();
    if (!secret) throw new Error('OTP_HMAC_SECRET must be configured in production');
    return secret;
}

const toHex = (buf: ArrayBuffer) => Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');

async function hmacHex(message: string): Promise<string> {
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(getSecret()), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    return toHex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message)));
}

async function sha256Hex(value: string): Promise<string> {
    return toHex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)));
}

function db() {
    if (!prisma) throw new Error('Database unavailable');
    return prisma;
}

export function generateCode(): string {
    return String(secureRandomInt(0, 999_999)).padStart(6, '0');
}

export async function hashCode(challengeId: string, code: string): Promise<string> {
    return hmacHex(`${challengeId}:${code}`);
}

/** Replaces any open challenge for the user and returns the plain code to email. */
export async function createChallenge(input: { userId: string; ip?: string; userAgent?: string; acceptedTerms?: boolean }): Promise<{ code: string }> {
    const client = db();
    const code = generateCode();
    const id = crypto.randomUUID();
    const now = new Date();

    // Caps mail volume and total guesses per account however many IP addresses the caller uses.
    const recent = await client.loginChallenge.count({ where: { userId: input.userId, createdAt: { gt: new Date(now.getTime() - 60 * 60_000) } } });
    if (recent >= MAX_CODES_PER_HOUR) throw new Error('TOO_MANY_CODES');

    await client.loginChallenge.updateMany({ where: { userId: input.userId, consumedAt: null }, data: { consumedAt: now } });
    await client.loginChallenge.deleteMany({ where: { userId: input.userId, createdAt: { lt: new Date(now.getTime() - 24 * 60 * 60_000) } } });
    await client.loginChallenge.create({
        data: {
            id,
            userId: input.userId,
            codeHash: await hashCode(id, code),
            expiresAt: new Date(now.getTime() + CODE_TTL_MS),
            acceptedTerms: input.acceptedTerms === true,
            ip: input.ip,
            userAgent: input.userAgent?.slice(0, 300),
        },
    });
    return { code };
}

export interface ChallengeResult {
    ok: boolean;
    acceptedTerms?: boolean;
    reason?: 'NO_CODE' | 'EXPIRED' | 'LOCKED' | 'INVALID';
    attemptsLeft?: number;
}

/** Checks a code. Every wrong guess is counted atomically; the right one is consumed exactly once. */
export async function verifyChallenge(userId: string, code: string): Promise<ChallengeResult> {
    const client = db();
    const now = new Date();
    const challenge = await client.loginChallenge.findFirst({
        where: { userId, consumedAt: null },
        orderBy: { createdAt: 'desc' },
    });
    if (!challenge) return { ok: false, reason: 'NO_CODE' };
    if (challenge.expiresAt <= now) return { ok: false, reason: 'EXPIRED' };

    const counted = await client.loginChallenge.updateMany({
        where: { id: challenge.id, consumedAt: null, attempts: { lt: MAX_CODE_ATTEMPTS } },
        data: { attempts: { increment: 1 } },
    });
    if (counted.count === 0) return { ok: false, reason: 'LOCKED' };

    const expected = await hashCode(challenge.id, code);
    if (!safeEqual(expected, challenge.codeHash)) {
        return { ok: false, reason: 'INVALID', attemptsLeft: Math.max(0, MAX_CODE_ATTEMPTS - (challenge.attempts + 1)) };
    }

    const consumed = await client.loginChallenge.updateMany({ where: { id: challenge.id, consumedAt: null }, data: { consumedAt: now } });
    if (consumed.count === 0) return { ok: false, reason: 'EXPIRED' };
    return { ok: true, acceptedTerms: challenge.acceptedTerms };
}

export function trustedCookieOptions() {
    return {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax' as const,
        path: '/',
        maxAge: TRUST_MS / 1000,
    };
}

/** Records this browser as trusted and returns the cookie value. Only its hash is stored. */
export async function trustDevice(userId: string, userAgent?: string): Promise<string> {
    const client = db();
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    const token = toHex(bytes.buffer);
    const now = Date.now();
    await client.trustedDevice.deleteMany({ where: { userId, expiresAt: { lt: new Date(now) } } });
    await client.trustedDevice.create({
        data: { userId, tokenHash: await sha256Hex(token), userAgent: userAgent?.slice(0, 300), expiresAt: new Date(now + TRUST_MS) },
    });
    return token;
}

/** True when the cookie matches a live device of this user; extends it by another 30 days. */
export async function isTrustedDevice(userId: string, token: string | undefined): Promise<boolean> {
    if (!token || !/^[0-9a-f]{64}$/.test(token)) return false;
    const client = db();
    const now = Date.now();
    const updated = await client.trustedDevice.updateMany({
        where: { userId, tokenHash: await sha256Hex(token), expiresAt: { gt: new Date(now) } },
        data: { lastUsedAt: new Date(now), expiresAt: new Date(now + TRUST_MS) },
    });
    return updated.count > 0;
}

export async function revokeTrustedDevices(userId: string): Promise<number> {
    return (await db().trustedDevice.deleteMany({ where: { userId } })).count;
}

export const RESEND_COOLDOWN_MS = 60_000;

/** The newest challenge for a user (open or used), for the resend cooldown and to carry the terms flag over. */
export async function latestChallenge(userId: string) {
    return db().loginChallenge.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true, acceptedTerms: true },
    });
}
