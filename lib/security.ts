import { prisma } from '@/lib/prisma';
import { createClient } from '@/utils/supabase/server';
import { getCachedUser } from '@/lib/users';
import { reportServerError } from '@/lib/error-capture';
import { NextResponse } from 'next/server';

// We import types from @prisma/client but NOT the PrismaClient itself here
// This avoids top-level Prisma initialization which causes the handler32 error
import type { Role } from '@prisma/client';

export const ADMIN_ROLES: Role[] = ['OWNER', 'PRINCIPAL', 'SUPERADMIN'];
export const TEACHER_ROLES: Role[] = ['TEACHER', 'HOMEROOM'];
export const STAFF_ROLES: Role[] = ['OWNER', 'PRINCIPAL', 'SUPERADMIN', 'TEACHER', 'HOMEROOM'];
export const ALL_ROLES: Role[] = ['OWNER', 'PRINCIPAL', 'SUPERADMIN', 'TEACHER', 'HOMEROOM', 'PARENT', 'STUDENT'];

import { headers } from 'next/headers';

/**
 * Ensures a user is authenticated.
 * Returns the Supabase User object or throws an error.
 */
export async function requireAuth() {
    const supabase = await createClient();
    
    // First check Authorization header for API access
    const reqHeaders = await headers();
    const authHeader = reqHeaders.get('authorization');
    
    let user;
    let error;

    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const { data, error: err } = await supabase.auth.getUser(token);
        user = data?.user;
        error = err;
    } else {
        // Fallback to cookie based session (Frontend)
        const { data, error: err } = await supabase.auth.getUser();
        user = data?.user;
        error = err;
    }

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

    let dbUser: { id: string; role: Role; schoolId: string | null; name: string; email: string | null; preferences: any } | null = null;

    if (prisma) {
        try {
            dbUser = await prisma.user.findUnique({
                where: { id: user.id },
                select: { id: true, role: true, schoolId: true, name: true, email: true, preferences: true }
            });
        } catch (err: any) {
            console.warn("[lib/security] Prisma findUnique failed, using getCachedUser fallback:", err.message);
        }
    }

    if (!dbUser) {
        const enriched = await getCachedUser(user.id);
        if (enriched) {
            dbUser = {
                id: enriched.id,
                role: enriched.role as Role,
                schoolId: enriched.schoolId || null,
                name: enriched.name || '',
                email: enriched.email || user.email || null,
                preferences: enriched.preferences || null
            };
        }
    }

    if (!dbUser) {
        throw new Error("Unauthorized: User record not found");
    }

    if (!allowedRoles.includes(dbUser.role)) {
        throw new Error(`Forbidden: Access denied for role ${dbUser.role}`);
    }

    if (!dbUser.schoolId) {
        const enriched = await getCachedUser(user.id);
        if (enriched?.schoolId) {
            dbUser.schoolId = enriched.schoolId;
        }
    }

    if (!dbUser.schoolId && dbUser.role !== 'SUPERADMIN') {
        throw new Error("Forbidden: User is not linked to any school tenant");
    }

    return dbUser;
}

/**
 * Ensures the Current User is linked to a school.
 */
export async function requireSchoolLinked() {
    const user = await requireAuth();
    
    let dbUser: { id: string; role: Role; schoolId: string | null; name: string; email: string | null; preferences: any } | null = null;

    if (prisma) {
        try {
            dbUser = await prisma.user.findUnique({
                where: { id: user.id },
                select: { id: true, role: true, schoolId: true, name: true, email: true, preferences: true }
            });
        } catch (err: any) {
            console.warn("[lib/security] Prisma findUnique failed, using getCachedUser fallback:", err.message);
        }
    }

    if (!dbUser) {
        const enriched = await getCachedUser(user.id);
        if (enriched) {
            dbUser = {
                id: enriched.id,
                role: enriched.role as Role,
                schoolId: enriched.schoolId || null,
                name: enriched.name || '',
                email: enriched.email || user.email || null,
                preferences: enriched.preferences || null
            };
        }
    }

    if (!dbUser) {
        // user_metadata is writable by the end user and must never grant a role or tenant.
        throw new Error("Unauthorized: User record not found");
    }

    if (!dbUser?.schoolId && dbUser?.role !== 'SUPERADMIN') {
        const enriched = await getCachedUser(user.id);
        if (enriched?.schoolId) {
            dbUser = { ...dbUser, schoolId: enriched.schoolId };
        }
    }

    if (!dbUser?.schoolId && dbUser?.role !== 'SUPERADMIN') {
        throw new Error("Forbidden: No school linked to this account");
    }

    return { ...dbUser, schoolId: dbUser.schoolId };
}

// ... rest of the file ...
// Note: handleApiError, secureJson, rateLimit, sanitizeInput, validateStringInput
// remain unchanged as they don't depend on Prisma.

export async function requireHomeroomAccess(classId: string) {
    const user = await requireRole(['TEACHER', 'HOMEROOM', 'OWNER', 'PRINCIPAL', 'SUPERADMIN']);

    const classRecord = await prisma.class.findUnique({
        where: { id: classId },
        select: { homeroomTeacherId: true, schoolId: true, grade: { select: { schoolId: true } } }
    });

    if (!classRecord) {
        throw new Error("Forbidden: Class not accessible");
    }

    const classSchoolId = classRecord.grade?.schoolId ?? classRecord.schoolId;
    if (user.role !== 'SUPERADMIN' && classSchoolId !== user.schoolId) {
        throw new Error("Forbidden: Class not accessible");
    }

    if (user.role === 'OWNER' || user.role === 'PRINCIPAL' || user.role === 'SUPERADMIN') return user;

    if (classRecord.homeroomTeacherId !== user.id) {
        throw new Error("Forbidden: You are not the homeroom teacher for this class");
    }

    return user;
}

/**
 * Resolves a student for a staff caller and enforces tenant isolation.
 * Admin roles must belong to the student's school; teachers must additionally be the
 * homeroom teacher of the student's class. SUPERADMIN is exempt from the tenant check.
 * Unknown and cross-tenant students are indistinguishable to the caller.
 */
export async function requireStudentAccess(studentId: string) {
    const user = await requireRole(STAFF_ROLES);

    const student = await prisma.student.findUnique({
        where: { id: studentId },
        select: { id: true, schoolId: true, classId: true }
    });

    if (!student) {
        throw new Error("Forbidden: Student not accessible");
    }

    if (user.role !== 'SUPERADMIN' && student.schoolId !== user.schoolId) {
        throw new Error("Forbidden: Student not accessible");
    }

    if (user.role === 'TEACHER' || user.role === 'HOMEROOM') {
        if (!student.classId || !(await isHomeroomTeacher(user.id, student.classId))) {
            throw new Error("Forbidden: You are not the homeroom teacher for this student");
        }
    }

    return { user, student };
}

export async function isHomeroomTeacher(userId: string, classId: string) {
    const classRecord = await prisma.class.findUnique({
        where: { id: classId },
        select: { homeroomTeacherId: true }
    });
    return classRecord?.homeroomTeacherId === userId;
}

const INTERNAL_ERROR_PATTERN = /prisma|invocation|\bpg\b|postgres|supabase|relation "|column "|violates|syntax error|ECONN|ETIMEDOUT|ENOTFOUND|socket|fetch failed|\bat .+\(.+:\d+:\d+\)|jwt|service[_ ]role|api[_ ]key|secret|token/i;

/**
 * Returns an error message that is safe to show to API clients.
 * Application errors pass through. Database, Prisma, Supabase, network and credential-related
 * errors are replaced with the fallback; the original is expected to be logged server-side.
 */
export function publicErrorMessage(error: unknown, fallback: string = "Internal Server Error"): string {
    if (!(error instanceof Error)) return fallback;

    const withCode = error as Error & { code?: unknown; hint?: unknown; details?: unknown };
    if (withCode.code !== undefined || withCode.hint !== undefined || withCode.details !== undefined) return fallback;
    if (/prisma|postgres|supabase|storage|fetch|auth/i.test(error.name) && error.name !== 'Error') return fallback;

    const message = error.message?.trim();
    if (!message || message.length > 200 || INTERNAL_ERROR_PATTERN.test(message)) return fallback;
    return message;
}

export function handleApiError(error: unknown) {
    console.error("API Security Error:", error);
    const message = error instanceof Error ? error.message : "Internal Server Error";
    if (message.startsWith("Unauthorized")) return secureJson({ error: "Unauthorized" }, 401);
    if (message.startsWith("Forbidden")) {
        // Denied access is worth seeing, but at warning level: it is the system working as intended
        void reportServerError(error, { type: 'auth_failure', level: 'WARN', status: 403 });
        return secureJson({ error: "Forbidden" }, 403);
    }
    if (
        message.toLowerCase().includes("timed out") || 
        message.toLowerCase().includes("connection pool") || 
        message.toLowerCase().includes("timeout") || 
        message.includes("ETIMEDOUT") || 
        message.includes("ECONNREFUSED") ||
        message.includes("504")
    ) {
        void reportServerError(error, { type: 'network_error', status: 504 });
        return secureJson({ error: "Campus ledger connection busy or timed out. Please retry.", code: "DB_TIMEOUT" }, 504);
    }
    void reportServerError(error, { status: 500 });
    return secureJson({ error: "Internal Server Error" }, 500);
}

const SECURITY_HEADERS: Record<string, string> = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(self), microphone=(), geolocation=()',
    'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
};

export function secureJson(data: any, status: number = 200) {
    const res = NextResponse.json(data, { status });
    for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
        res.headers.set(key, value);
    }
    return res;
}

type RateLimitEntry = { count: number; resetAt: number };
const rateLimitStore = new Map<string, RateLimitEntry>();
let lastCleanup = 0;
function cleanupRateLimits() {
    const now = Date.now();
    if (now - lastCleanup < 60_000) return;
    lastCleanup = now;
    for (const [key, entry] of rateLimitStore) {
        if (now > entry.resetAt) rateLimitStore.delete(key);
    }
}

export function rateLimit(
    request: Request,
    endpoint: string,
    maxRequests: number,
    windowMs: number = 60_000
): NextResponse | null {
    cleanupRateLimits();
    const rawForwarded = request.headers.get('x-forwarded-for');
    const rawIp = request.headers.get('cf-connecting-ip')
        || request.headers.get('x-real-ip')
        || (rawForwarded ? rawForwarded.split(',')[0].trim() : null)
        || 'unknown';
    const ip = rawIp.replace(/^\[?([^\]]+)\]?:[0-9]+$/, '$1').trim();

    // Bypass localhost/dev testing
    if (ip === '127.0.0.1' || ip === '::1' || ip === 'localhost') {
        return null;
    }

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
        return secureJson({ error: `Rate limit exceeded. Try again in ${retryAfter}s.` }, 429);
    }
    return null;
}

/**
 * Constant-time string comparison. Always inspects the full length of the longer input
 * so response timing does not reveal how many leading characters matched.
 */
export function safeEqual(a: string, b: string): boolean {
    const enc = new TextEncoder();
    const x = enc.encode(a);
    const y = enc.encode(b);
    let diff = x.length ^ y.length;
    const len = Math.max(x.length, y.length);
    for (let i = 0; i < len; i++) {
        diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
    }
    return diff === 0;
}

const HTML_ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** Escapes untrusted text for safe interpolation into HTML (emails, templates). */
export function escapeHtml(value: string): string {
    return value.replace(/[&<>"']/g, ch => HTML_ESCAPES[ch]);
}

/** Collapses control characters and line breaks so a value is safe in an email subject or header. */
export function singleLine(value: string): string {
    return value.replace(/[\u0000-\u001f\u007f]+/g, ' ').trim();
}

const EMAIL_PATTERN = /^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']+$/;

export function isValidEmail(value: unknown): value is string {
    return typeof value === 'string' && value.length <= 254 && EMAIL_PATTERN.test(value);
}

/**
 * Authorizes a scheduler-triggered request. The CRON_SECRET must be configured and sent as
 * "Authorization: Bearer <secret>"; an unset secret disables the endpoint instead of opening it.
 */
export function isAuthorizedCron(request: Request): boolean {
    const secret = process.env.CRON_SECRET;
    if (!secret) {
        console.error('[Cron] CRON_SECRET is not configured; refusing to run.');
        return false;
    }
    return safeEqual(request.headers.get('authorization') || '', `Bearer ${secret}`);
}


export function sanitizeInput(input: string): string {
    return input.replace(/<[^>]*>/g, '').replace(/javascript\s*:/gi, '').replace(/on\w+\s*=/gi, '').replace(/data\s*:[^,]*,/gi, '').replace(/\s+/g, ' ').trim();
}

export function validateStringInput(value: unknown, maxLength: number, minLength: number = 1): string | null {
    if (typeof value !== 'string') return null;
    const sanitized = sanitizeInput(value).slice(0, maxLength);
    if (sanitized.length < minLength) return null;
    return sanitized;
}
