import { cache } from 'react';
import { prisma } from '@/lib/prisma';
import { createClient } from '@supabase/supabase-js';

// Initialize a privileged Service Role client for critical internal fallbacks.
// This bypasses RLS and schema usage restrictions, ensuring profile lookups 
// always succeed even if the standard 'anon' role is restricted.
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * Cached function to retrieve the full database user profile by Supabase ID.
 * Falls back to Supabase HTTP Admin client if Prisma TCP connection fails at the Edge.
 */
export const getCachedUser = cache(async (userId: string) => {
    try {
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
        console.error(`[lib/users] Prisma lookup by ID failed for ${userId}:`, error.message);
    }

    try {
        console.log(`[lib/users] Falling back to Supabase Admin lookup by ID for ${userId}`);
        // Privileged HTTP Fallback (Bypasses RLS/Permission Denied)
        const { data, error } = await supabaseAdmin
            .from('User')
            .select('*, school:School(*)')
            .eq('id', userId)
            .maybeSingle();

        if (error) {
            console.error(`[lib/users] Supabase Admin fallback error for ${userId}:`, error.message);
            return null;
        }

        if (!data) return null;

        return {
            ...data,
            school: data.school ? {
                ...data.school,
                _count: { students: 0, users: 0 }
            } : null
        };
    } catch (fallbackError: any) {
        console.error(`[lib/users] Critical fallback failure for ${userId}:`, fallbackError.message);
        return null;
    }
});

/**
 * Fallback to email search if ID mismatch occurs
 */
export const getCachedUserByEmail = cache(async (email: string) => {
    try {
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
        console.error(`[lib/users] Prisma lookup by email failed for ${email}:`, error.message);
    }

    try {
        console.log(`[lib/users] Falling back to Supabase Admin lookup by email for ${email}`);
        const { data, error: sbError } = await supabaseAdmin
            .from('User')
            .select('*, school:School(*)')
            .eq('email', email)
            .maybeSingle();

        if (sbError) {
            console.error(`[lib/users] Supabase Admin lookup by email failed for ${email}:`, sbError.message);
            return null;
        }

        if (!data) return null;
        
        return {
            ...data,
            school: data.school ? { ...data.school, _count: { students: 0, users: 0 } } : null
        };
    } catch (fallbackError: any) {
        console.error(`[lib/users] Critical fallback failure for ${email}:`, fallbackError.message);
        return null;
    }
});
