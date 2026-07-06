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

    let dbUser: any = null;

    if (!prisma) {
        const { createClient: createSupabaseAdmin } = require('@supabase/supabase-js');
        const supabaseAdmin = createSupabaseAdmin(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );
        const { data: u1 } = await supabaseAdmin
            .from('User')
            .select('id, role, email')
            .eq('id', user.id)
            .maybeSingle();
        dbUser = u1;
        if (!dbUser && user.email) {
            const { data: u2 } = await supabaseAdmin
                .from('User')
                .select('id, role, email')
                .eq('email', user.email)
                .maybeSingle();
            dbUser = u2;
            if (dbUser && dbUser.id !== user.id) {
                console.error(`[AdminAuth] CRITICAL SECURITY ALERT (Edge): ID Mismatch for ${user.email}. Access Denied.`);
                return null;
            }
        }
    } else {
        // Try direct ID lookup first
        dbUser = await prisma.user.findUnique({
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
    }

    if (!dbUser || dbUser.role !== 'SUPERADMIN') {
        console.warn(`[AdminAuth] Forbidden: User ${user.email} is not a SUPERADMIN. Role: ${dbUser?.role}`);
        return null;
    }

    console.log(`[AdminAuth] Authorized SuperAdmin: ${dbUser.email}`);
    return dbUser;
}
