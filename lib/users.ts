import { cache } from 'react';
import { prisma } from '@/lib/prisma';
import { createClient } from '@supabase/supabase-js';

// Removed top-level supabaseAdmin to ensure runtime evaluation of Edge env vars

/**
 * Retrieves the full database user profile by Supabase ID.
 * Prefers Supabase HTTP lookup on Edge for stability.
 */
export const getCachedUser = cache(async (userId: string) => {
    const { prisma: _p } = require('@/lib/prisma');
    const isEdge = !_p;

    // On Edge, we prefer Supabase SDK immediately to avoid Prisma bundling issues
    if (isEdge) {
        return fetchUserFromSupabase(userId, 'id');
    }

    try {
        if (!prisma) throw new Error("Prisma client not available");
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { 
                school: {
                    select: { 
                        id: true, 
                        name: true, 
                        status: true, 
                        logoUrl: true,
                        address: true,
                        _count: {
                            select: { students: true, users: true }
                        }
                    }
                } 
            }
        });
        if (user) return user;
    } catch (error: any) {
        console.warn(`[lib/users] Prisma ID lookup skipped/failed: ${error.message}`);
    }

    return fetchUserFromSupabase(userId, 'id');
});

export const getCachedUserByEmail = cache(async (email: string) => {
    const { prisma: _p2 } = require('@/lib/prisma');
    const isEdge = !_p2;

    if (isEdge) {
        return fetchUserFromSupabase(email, 'email');
    }

    try {
        if (!prisma) throw new Error("Prisma client not available");
        const user = await prisma.user.findUnique({
            where: { email },
            include: { 
                school: {
                    select: { id: true, name: true, status: true, logoUrl: true, address: true, _count: { select: { students: true, users: true } } }
                } 
            }
        });
        if (user) return user;
    } catch (error: any) {
        console.warn(`[lib/users] Prisma email lookup skipped/failed: ${error.message}`);
    }

    return fetchUserFromSupabase(email, 'email');
});

async function fetchUserFromSupabase(value: string, field: 'id' | 'email') {
    try {
        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );
        const { data, error } = await supabaseAdmin
            .from('User')
            .select('*, school:School(*)')
            .eq(field, value)
            .maybeSingle();

        if (error || !data) return null;

        return {
            ...data,
            school: data.school ? {
                ...data.school,
                _count: { students: 0, users: 0 }
            } : null
        };
    } catch (err: any) {
        console.error(`[lib/users] Supabase fetch failed for ${field}=${value}:`, err.message);
        return null;
    }
}
