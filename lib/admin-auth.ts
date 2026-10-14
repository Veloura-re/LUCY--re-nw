import { createClient } from '@/utils/supabase/server';
import { prisma } from '@/lib/prisma';

/**
 * Verifies the current user is a SUPERADMIN.
 * Handles ID mismatches between Supabase Auth and Prisma by falling back
 * to email-based lookup and auto-syncing the ID.
 * 
 * Returns the dbUser if authorized, or null if not.
 */
export async function verifySuperAdmin() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        console.warn('[AdminAuth] Unauthorized: No active Supabase session found.');
        return null;
    }

    // Try direct ID lookup first
    let dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { id: true, role: true, email: true }
    });

    // Fallback: email-based lookup (Read-only, NO auto-sync for SUPERADMIN to prevent spoofing)
    if (!dbUser && user.email) {
        dbUser = await prisma.user.findUnique({
            where: { email: user.email },
            select: { id: true, role: true, email: true }
        });
        
        if (dbUser && dbUser.id !== user.id) {
            console.error(`[AdminAuth] CRITICAL SECURITY ALERT: ID Mismatch for ${user.email}. Supabase ID: ${user.id}, Database ID: ${dbUser.id}. Access Denied to prevent account takeover.`);
            return null;
        }
    }

    if (!dbUser || dbUser.role !== 'SUPERADMIN') {
        console.warn(`[AdminAuth] Forbidden: User ${user.email} is not a SUPERADMIN. Role: ${dbUser?.role}`);
        return null;
    }

    return dbUser;
}

/** Parses page and limit from a query string with sane bounds, so a request cannot ask for a million rows. */
export function parsePaging(params: URLSearchParams, maxLimit = 200, defaultLimit = 50) {
    const toInt = (v: string | null, fallback: number) => {
        const n = parseInt(v ?? '', 10);
        return Number.isFinite(n) ? n : fallback;
    };
    const limit = Math.min(Math.max(toInt(params.get('limit'), defaultLimit), 1), maxLimit);
    const page = Math.max(toInt(params.get('page'), 1), 1);
    return { page, limit, skip: (page - 1) * limit };
}

const WINDOWS: Record<string, number> = { '1h': 3600e3, '24h': 24 * 3600e3, '7d': 7 * 24 * 3600e3, '30d': 30 * 24 * 3600e3 };

/** Converts "1h", "24h", "7d" or "30d" into a start date; anything else (or "all") means no limit. */
export function parseSince(value: string | null): Date | undefined {
    const ms = value ? WINDOWS[value] : undefined;
    return ms ? new Date(Date.now() - ms) : undefined;
}
