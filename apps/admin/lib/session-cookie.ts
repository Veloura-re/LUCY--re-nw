import { AdminRole } from '@prisma/client';

export const ADMIN_SESSION_COOKIE = 'lucy_admin_session';
export const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
export const MAX_LOGIN_ATTEMPTS = 5;
export const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes lockout

function getHmacSecret(): string {
    const secret = process.env.ADMIN_SESSION_SECRET || process.env.OTP_HMAC_SECRET || 'lucy-admin-fallback-hmac-secret-change-in-prod';
    return secret;
}

const toHex = (buf: ArrayBuffer) => Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');

export async function hmacSha256(message: string): Promise<string> {
    const key = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(getHmacSecret()),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );
    return toHex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message)));
}

export interface AdminSessionPayload {
    adminId: string;
    role: AdminRole;
    lastActiveAt: number;
    sessionId: string;
}

export interface AdminAuthContext {
    id: string;
    email: string;
    name: string;
    role: AdminRole;
    sessionId: string;
}

/**
 * Creates a signed cookie string in the format:
 * `${adminId}.${role}.${lastActiveAt}.${sessionId}.${signature}`
 */
export async function signSessionCookie(payload: AdminSessionPayload): Promise<string> {
    const raw = `${payload.adminId}.${payload.role}.${payload.lastActiveAt}.${payload.sessionId}`;
    const sig = await hmacSha256(raw);
    return `${raw}.${sig}`;
}

/**
 * Verifies a signed cookie string without requiring a database query (Edge-safe).
 */
export async function verifySessionCookieFast(cookieValue?: string | null): Promise<AdminSessionPayload | null> {
    if (!cookieValue) return null;
    const parts = cookieValue.split('.');
    if (parts.length !== 5) return null;

    const [adminId, roleStr, lastActiveStr, sessionId, signature] = parts;
    const raw = `${adminId}.${roleStr}.${lastActiveStr}.${sessionId}`;
    const expectedSig = await hmacSha256(raw);

    if (signature !== expectedSig) return null;

    const lastActiveAt = parseInt(lastActiveStr, 10);
    if (isNaN(lastActiveAt)) return null;

    // Check 30-minute inactivity
    const now = Date.now();
    if (now - lastActiveAt > INACTIVITY_TIMEOUT_MS) {
        return null; // Expired
    }

    if (!Object.values(AdminRole).includes(roleStr as AdminRole)) {
        return null;
    }

    return {
        adminId,
        role: roleStr as AdminRole,
        lastActiveAt,
        sessionId,
    };
}
