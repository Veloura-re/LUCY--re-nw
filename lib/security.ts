import { prisma } from '@/lib/prisma';
import { createClient } from '@/utils/supabase/server';
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

    let dbUser: any = null;

    if (!prisma) {
        // Edge runtime: use Supabase directly for speed and compatibility
        const { createClient } = require('@supabase/supabase-js');
        const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
        const { data } = await supabaseAdmin
            .from('User')
            .select('id, role, schoolId, name')
            .eq('id', user.id)
            .single();
        dbUser = data;
    } else {
        // Node runtime: use Prisma
        dbUser = await prisma.user.findUnique({
            where: { id: user.id },
            select: { id: true, role: true, schoolId: true, name: true }
        });
    }

    if (!dbUser) {
        throw new Error("Unauthorized: User record not found");
    }

    if (!allowedRoles.includes(dbUser.role)) {
        throw new Error(`Forbidden: Access denied for role ${dbUser.role}`);
    }

    if (!dbUser.schoolId) {
        try {
            const { getCachedUser } = require('@/lib/users');
            const enriched = await getCachedUser(user.id);
            if (enriched?.schoolId) {
                dbUser.schoolId = enriched.schoolId;
            }
        } catch {}
    }

    if (!dbUser.schoolId) {
        try {
            const activeSchool = await prisma.school.findFirst({
                where: { status: 'ACTIVE' },
                orderBy: { createdAt: 'desc' },
                select: { id: true }
            }) || await prisma.school.findFirst({
                orderBy: { createdAt: 'desc' },
                select: { id: true }
            });
            if (activeSchool) {
                dbUser.schoolId = activeSchool.id;
                await prisma.user.update({
                    where: { id: dbUser.id },
                    data: { schoolId: activeSchool.id }
                }).catch(() => {});
            }
        } catch {}
    }

    return dbUser;
}

/**
 * Ensures the Current User is linked to a school.
 */
export async function requireSchoolLinked() {
    const user = await requireAuth();
    
    let dbUser: any = null;

    if (!prisma) {
        const { createClient } = require('@supabase/supabase-js');
        const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
        const { data } = await supabaseAdmin
            .from('User')
            .select('id, role, schoolId')
            .or(`id.eq.${user.id},email.eq.${user.email}`)
            .limit(1)
            .maybeSingle();
        dbUser = data;
    } else {
        dbUser = await prisma.user.findFirst({
            where: {
                OR: [
                    { id: user.id },
                    { email: user.email || '' }
                ]
            },
            select: { id: true, role: true, schoolId: true }
        });
    }

    if (!dbUser) {
        // Fallback: Use auth user profile
        dbUser = {
            id: user.id,
            role: user.user_metadata?.role || 'OWNER',
            schoolId: user.user_metadata?.schoolId || null
        };
    }

    if (!dbUser?.schoolId) {
        try {
            const { getCachedUser } = require('@/lib/users');
            const enriched = await getCachedUser(user.id);
            if (enriched?.schoolId) {
                dbUser = { ...dbUser, schoolId: enriched.schoolId };
            }
        } catch {}
    }

    if (!dbUser?.schoolId) {
        try {
            const activeSchool = await prisma.school.findFirst({
                where: { status: 'ACTIVE' },
                orderBy: { createdAt: 'desc' },
                select: { id: true }
            }) || await prisma.school.findFirst({
                orderBy: { createdAt: 'desc' },
                select: { id: true }
            });
            if (activeSchool) {
                dbUser = { ...dbUser, schoolId: activeSchool.id };
                await prisma.user.update({
                    where: { id: dbUser.id },
                    data: { schoolId: activeSchool.id }
                }).catch(() => {});
            }
        } catch {}
    }

    if (!dbUser?.schoolId) {
        throw new Error("Forbidden: No school linked to this account");
    }

    return { ...dbUser, schoolId: dbUser.schoolId };
}

// ... rest of the file ...
// Note: handleApiError, secureJson, rateLimit, sanitizeInput, validateStringInput
// remain unchanged as they don't depend on Prisma.

export async function requireHomeroomAccess(classId: string) {
    const user = await requireRole(['TEACHER', 'HOMEROOM', 'OWNER', 'PRINCIPAL', 'SUPERADMIN']);
    if (user.role === 'OWNER' || user.role === 'PRINCIPAL' || user.role === 'SUPERADMIN') return user;

    let classRecord: any = null;

    if (!prisma) {
        const { createClient } = require('@supabase/supabase-js');
        const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
        const { data } = await supabaseAdmin
            .from('Class')
            .select('homeroomTeacherId')
            .eq('id', classId)
            .single();
        classRecord = data;
    } else {
        classRecord = await prisma.class.findUnique({
            where: { id: classId },
            select: { homeroomTeacherId: true }
        });
    }

    if (classRecord?.homeroomTeacherId !== user.id) {
        throw new Error("Forbidden: You are not the homeroom teacher for this class");
    }

    return user;
}

export async function isHomeroomTeacher(userId: string, classId: string) {
    let classRecord: any = null;

    if (!prisma) {
        const { createClient } = require('@supabase/supabase-js');
        const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
        const { data } = await supabaseAdmin
            .from('Class')
            .select('homeroomTeacherId')
            .eq('id', classId)
            .single();
        classRecord = data;
    } else {
        classRecord = await prisma.class.findUnique({
            where: { id: classId },
            select: { homeroomTeacherId: true }
        });
    }
    return classRecord?.homeroomTeacherId === userId;
}

export function handleApiError(error: unknown) {
    console.error("API Security Error:", error);
    const message = error instanceof Error ? error.message : "Internal Server Error";
    if (message.startsWith("Unauthorized")) return secureJson({ error: "Unauthorized" }, 401);
    if (message.startsWith("Forbidden")) return secureJson({ error: "Forbidden" }, 403);
    if (
        message.toLowerCase().includes("timed out") || 
        message.toLowerCase().includes("connection pool") || 
        message.toLowerCase().includes("timeout") || 
        message.includes("ETIMEDOUT") || 
        message.includes("ECONNREFUSED") ||
        message.includes("504")
    ) {
        return secureJson({ error: "Campus ledger connection busy or timed out. Please retry.", code: "DB_TIMEOUT" }, 504);
    }
    return secureJson({ error: "Internal Server Error" }, 500);
}

const SECURITY_HEADERS: Record<string, string> = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://ajax.cloudflare.com https://static.cloudflareinsights.com https://*.cloudflare.com https://*.supabase.co; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob: https:; font-src 'self' data: https://fonts.gstatic.com https://fonts.googleapis.com; connect-src 'self' https://* wss://*; frame-src 'self' https://*; worker-src 'self' blob:;",
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

export function sanitizeInput(input: string): string {
    return input.replace(/<[^>]*>/g, '').replace(/javascript\s*:/gi, '').replace(/on\w+\s*=/gi, '').replace(/data\s*:[^,]*,/gi, '').replace(/\s+/g, ' ').trim();
}

export function validateStringInput(value: unknown, maxLength: number, minLength: number = 1): string | null {
    if (typeof value !== 'string') return null;
    const sanitized = sanitizeInput(value).slice(0, maxLength);
    if (sanitized.length < minLength) return null;
    return sanitized;
}
