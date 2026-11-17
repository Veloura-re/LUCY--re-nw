import { prisma } from './prisma';
import bcrypt from 'bcryptjs';
import { AdminRole, AdminUser } from '@prisma/client';

export const ADMIN_SESSION_COOKIE = 'lucy_admin_session';
export const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
export const MAX_LOGIN_ATTEMPTS = 5;
export const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes lockout after 5 failures

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

export async function hashPassword(plain: string): Promise<string> {
    return bcrypt.hash(plain, 12);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
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

/**
 * Creates an Admin session in the database and returns the signed cookie value.
 */
export async function createAdminSession(
    admin: AdminUser,
    ipAddress: string,
    userAgent?: string
): Promise<{ cookieValue: string; expiresAt: Date; sessionId: string }> {
    const now = Date.now();
    const expiresAt = new Date(now + INACTIVITY_TIMEOUT_MS);
    const sessionTokenHash = await hmacSha256(`session:${admin.id}:${now}:${crypto.randomUUID()}`);

    const session = await prisma.adminSession.create({
        data: {
            adminId: admin.id,
            sessionToken: sessionTokenHash,
            ipAddress,
            userAgent: userAgent ? userAgent.slice(0, 512) : null,
            lastActiveAt: new Date(now),
            expiresAt,
            isRevoked: false,
        },
    });

    const cookieValue = await signSessionCookie({
        adminId: admin.id,
        role: admin.role,
        lastActiveAt: now,
        sessionId: session.id,
    });

    return {
        cookieValue,
        expiresAt,
        sessionId: session.id,
    };
}

/**
 * Deeply validates session against the database, updates sliding activity timestamp,
 * and confirms session has not been revoked.
 */
export async function getAuthenticatedAdmin(cookieValue?: string | null): Promise<AdminAuthContext | null> {
    const parsed = await verifySessionCookieFast(cookieValue);
    if (!parsed) return null;

    const session = await prisma.adminSession.findUnique({
        where: { id: parsed.sessionId },
        include: { admin: true },
    });

    if (!session || session.isRevoked) {
        return null;
    }

    const now = new Date();
    // Verify database inactivity timestamp
    if (now.getTime() - session.lastActiveAt.getTime() > INACTIVITY_TIMEOUT_MS) {
        await prisma.adminSession.update({
            where: { id: session.id },
            data: { isRevoked: true },
        });
        return null;
    }

    // Sliding window: bump DB lastActiveAt
    await prisma.adminSession.update({
        where: { id: session.id },
        data: {
            lastActiveAt: now,
            expiresAt: new Date(now.getTime() + INACTIVITY_TIMEOUT_MS),
        },
    });

    return {
        id: session.admin.id,
        email: session.admin.email,
        name: session.admin.name,
        role: session.admin.role,
        sessionId: session.id,
    };
}

/**
 * Revokes an admin session.
 */
export async function revokeAdminSessionById(sessionId: string): Promise<boolean> {
    try {
        await prisma.adminSession.update({
            where: { id: sessionId },
            data: { isRevoked: true },
        });
        return true;
    } catch {
        return false;
    }
}
