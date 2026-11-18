import { prisma } from './prisma';
import bcrypt from 'bcryptjs';
import { AdminRole, AdminUser } from '@prisma/client';

export {
    ADMIN_SESSION_COOKIE,
    INACTIVITY_TIMEOUT_MS,
    MAX_LOGIN_ATTEMPTS,
    LOCKOUT_DURATION_MS,
    type AdminSessionPayload,
    type AdminAuthContext,
    hmacSha256,
    signSessionCookie,
    verifySessionCookieFast,
} from './session-cookie';

import {
    ADMIN_SESSION_COOKIE,
    INACTIVITY_TIMEOUT_MS,
    type AdminAuthContext,
    signSessionCookie,
    verifySessionCookieFast,
    hmacSha256,
} from './session-cookie';

export async function hashPassword(plain: string): Promise<string> {
    return bcrypt.hash(plain, 12);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
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
