/**
 * Stateless proof that the device session cookie was issued by this server for this user.
 * Middleware runs on the edge without database access and cannot compare the cookie with the stored
 * token, but it can check this signature, so even a crafted partial-page request is refused for a
 * session that never completed sign-in. Web Crypto only, so it runs on Node and Workers.
 */
export const DEVICE_MARK_COOKIE = 'lucy_device_mark';

export function getHmacSecret(): string | null {
    const secret = process.env.OTP_HMAC_SECRET;
    if (secret) return secret;
    return process.env.NODE_ENV === 'production' ? null : 'lucy-dev-only-otp-secret';
}

const toHex = (buf: ArrayBuffer) => Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');

export async function deviceMark(userId: string, sessionToken: string): Promise<string> {
    const secret = getHmacSecret();
    if (!secret) throw new Error('OTP_HMAC_SECRET must be configured in production');
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    return toHex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`device:${userId}:${sessionToken}`)));
}

/** Constant-time check. A missing secret or malformed input is simply invalid. */
export async function isValidDeviceMark(userId: string, sessionToken: string | undefined, mark: string | undefined): Promise<boolean> {
    if (!sessionToken || !mark || !getHmacSecret()) return false;
    const expected = await deviceMark(userId, sessionToken);
    if (expected.length !== mark.length) return false;
    let diff = 0;
    for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ mark.charCodeAt(i);
    return diff === 0;
}

/**
 * Device cookies issued before the signed mark existed (the 30 day cookie lifetime) can be upgraded
 * once, so users who were already signed in are not logged out at deploy. After this date the route
 * refuses and the path can be deleted.
 */
export const LEGACY_UPGRADE_UNTIL = Date.parse('2026-12-15T00:00:00Z');
