import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

// We import types from @prisma/client but NOT the PrismaClient itself here
// This avoids top-level Prisma initialization which causes the handler32 error
import type { Role } from '@prisma/client';

export const ADMIN_ROLES: Role[] = ['PRINCIPAL', 'SUPERADMIN'];
export const TEACHER_ROLES: Role[] = ['TEACHER', 'HOMEROOM'];
export const STAFF_ROLES: Role[] = ['PRINCIPAL', 'SUPERADMIN', 'TEACHER', 'HOMEROOM'];
export const ALL_ROLES: Role[] = ['PRINCIPAL', 'SUPERADMIN', 'TEACHER', 'HOMEROOM', 'PARENT', 'STUDENT'];

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

    const { prisma } = require('@/lib/prisma');
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

    if (!dbUser.schoolId && dbUser.role === 'SUPERADMIN') {
        dbUser.schoolId = 'c4020909-c825-4490-9790-18e0632dbeaf';
    }

    return dbUser;
}

/**
 * Ensures the Current User is linked to a school.
 */
export async function requireSchoolLinked() {
    const user = await requireAuth();
    
    let dbUser: any = null;
    const { prisma } = require('@/lib/prisma');

    if (!prisma) {
        const { createClient } = require('@supabase/supabase-js');
        const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
        const { data } = await supabaseAdmin
            .from('User')
            .select('id, role, schoolId')
            .eq('id', user.id)
            .single();
        dbUser = data;
    } else {
        dbUser = await prisma.user.findUnique({
            where: { id: user.id },
            select: { id: true, role: true, schoolId: true }
        });
    }

    if (!dbUser?.schoolId) {
        if (dbUser?.role === 'SUPERADMIN') {
            return { ...dbUser, schoolId: 'c4020909-c825-4490-9790-18e0632dbeaf' };
        }
        throw new Error("Forbidden: No school linked to this account");
    }

    return { ...dbUser, schoolId: dbUser.schoolId };
}

// ... rest of the file ...
// Note: handleApiError, secureJson, rateLimit, sanitizeInput, validateStringInput
// remain unchanged as they don't depend on Prisma.

export async function requireHomeroomAccess(classId: string) {
    const user = await requireRole(['TEACHER', 'HOMEROOM', 'PRINCIPAL', 'SUPERADMIN']);
    if (user.role === 'PRINCIPAL' || user.role === 'SUPERADMIN') return user;

    const { prisma } = require('@/lib/prisma');
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
    const { prisma } = require('@/lib/prisma');
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
