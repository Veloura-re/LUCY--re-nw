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
