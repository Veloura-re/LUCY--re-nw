import { createClient } from '@/utils/supabase/server';
import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';
import { NextResponse } from 'next/server';

export const ADMIN_ROLES: Role[] = ['PRINCIPAL', 'SUPERADMIN'];
export const TEACHER_ROLES: Role[] = ['TEACHER', 'HOMEROOM'];
export const STAFF_ROLES: Role[] = ['PRINCIPAL', 'SUPERADMIN', 'TEACHER', 'HOMEROOM'];
export const ALL_ROLES: Role[] = ['PRINCIPAL', 'SUPERADMIN', 'TEACHER', 'HOMEROOM', 'PARENT', 'STUDENT'];

/**
 * Ensures a user is authenticated.
 * Returns the Supabase User object or throws an error.
 */
export async function requireAuth() {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
        throw new Error("Unauthorized: Login required");
    }

    return user;
}

/**
 * Ensures the Current User has one of the allowed roles.
 * Returns the DB User object (with Role and SchoolId) or throws.
 */
export async function requireRole(allowedRoles: Role[]) {
    const user = await requireAuth();

    // We need the DB user to check the role, as metadata might be stale
    const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { id: true, role: true, schoolId: true, name: true }
    });

    if (!dbUser) {
        throw new Error("Unauthorized: User record not found");
    }

    if (!allowedRoles.includes(dbUser.role)) {
        throw new Error(`Forbidden: Access denied for role ${dbUser.role}`);
    }

    return dbUser;
}

/**
 * Ensures the Current User is linked to a school.
 * Returns the DB User object with guaranteed schoolId.
 */
export async function requireSchoolLinked() {
    const user = await requireAuth();

    const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { id: true, role: true, schoolId: true }
    });

    if (!dbUser?.schoolId) {
        throw new Error("Forbidden: No school linked to this account");
    }

    return { ...dbUser, schoolId: dbUser.schoolId }; // Type narrowing
}

/**
 * Ensures the user is the assigned Homeroom Teacher for a class.
 */
export async function requireHomeroomAccess(classId: string) {
    const user = await requireRole(['TEACHER', 'HOMEROOM', 'PRINCIPAL', 'SUPERADMIN']);

    // Principals and Superadmins have bypass access
    if (user.role === 'PRINCIPAL' || user.role === 'SUPERADMIN') return user;

    const classRecord = await prisma.class.findUnique({
        where: { id: classId },
        select: { homeroomTeacherId: true }
    });

    if (classRecord?.homeroomTeacherId !== user.id) {
        throw new Error("Forbidden: You are not the homeroom teacher for this class");
    }

    return user;
}

/**
 * Check if a user is the homeroom teacher for a specific class.
 */
export async function isHomeroomTeacher(userId: string, classId: string) {
    const classRecord = await prisma.class.findUnique({
        where: { id: classId },
        select: { homeroomTeacherId: true }
    });
    return classRecord?.homeroomTeacherId === userId;
}

/**
 * Standard API Error Response Wrapper
 */
export function handleApiError(error: unknown) {
    console.error("API Security Error:", error);
    const message = error instanceof Error ? error.message : "Internal Server Error";

    if (message.startsWith("Unauthorized")) return secureJson({ error: "Unauthorized" }, 401);
    if (message.startsWith("Forbidden")) return secureJson({ error: "Forbidden" }, 403);

    // Mask all other errors (Prisma, etc) with a generic message
    return secureJson({ error: "Internal Server Error" }, 500);
}

// ─────────────────────────────────────────────────
// SECURITY HEADERS
// ─────────────────────────────────────────────────

const SECURITY_HEADERS: Record<string, string> = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://generativelanguage.googleapis.com",
};

/**
 * Returns a NextResponse.json with security headers applied.
 */
export function secureJson(data: any, status: number = 200) {
    const res = NextResponse.json(data, { status });
    for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
        res.headers.set(key, value);
    }
    return res;
}

// ─────────────────────────────────────────────────
// RATE LIMITER (In-Memory, Per-Worker)
// ─────────────────────────────────────────────────

type RateLimitEntry = { count: number; resetAt: number };
const rateLimitStore = new Map<string, RateLimitEntry>();


// Lazy cleanup: remove stale entries on access (no setInterval needed — Workers are stateless)
let lastCleanup = 0;
function cleanupRateLimits() {
    const now = Date.now();
    if (now - lastCleanup < 60_000) return;
    lastCleanup = now;
    for (const [key, entry] of rateLimitStore) {
        if (now > entry.resetAt) rateLimitStore.delete(key);
    }
}

/**
 * IP-based rate limiter.
 * @param request - The incoming Request object
 * @param endpoint - A unique key for the endpoint (e.g. "public/comments/POST")
 * @param maxRequests - Maximum requests allowed in the window
 * @param windowMs - Window duration in milliseconds (default 60s)
 * @returns null if allowed, or a 429 NextResponse if rate-limited
 */
export function rateLimit(
    request: Request,
    endpoint: string,
    maxRequests: number,
    windowMs: number = 60_000
): NextResponse | null {
    cleanupRateLimits();
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
        || request.headers.get('cf-connecting-ip')
        || request.headers.get('x-real-ip')
        || 'unknown';

    const key = `${ip}:${endpoint}`;
    const now = Date.now();
    const entry = rateLimitStore.get(key);

    if (!entry || now > entry.resetAt) {
        rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
        return null;
    }

    entry.count++;
    if (entry.count > maxRequests) {
        const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
        return secureJson(
            { error: `Rate limit exceeded. Try again in ${retryAfter}s.` },
            429
        );
    }

    return null;
}

// ─────────────────────────────────────────────────
// INPUT SANITIZATION (XSS Prevention)
// ─────────────────────────────────────────────────

/**
 * Strips HTML tags and dangerous patterns from a string.
 * Use on all user-provided text before storing in DB.
 */
export function sanitizeInput(input: string): string {
    return input
        // Strip HTML tags
        .replace(/<[^>]*>/g, '')
        // Strip javascript: URIs
        .replace(/javascript\s*:/gi, '')
        // Strip event handlers
        .replace(/on\w+\s*=/gi, '')
        // Strip data: URIs (potential XSS vectors)
        .replace(/data\s*:[^,]*,/gi, '')
        // Collapse multiple whitespace
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Validate and constrain a string input.
 * Returns the sanitized string or null if invalid.
 */
export function validateStringInput(
    value: unknown,
    maxLength: number,
    minLength: number = 1
): string | null {
    if (typeof value !== 'string') return null;
    const sanitized = sanitizeInput(value).slice(0, maxLength);
    if (sanitized.length < minLength) return null;
    return sanitized;
}
