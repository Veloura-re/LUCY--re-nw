import { cache } from 'react';
import { prisma } from '@/lib/prisma';

/**
 * Cached function to retrieve the full database user profile by Supabase ID.
 * This is deduplicated within a single request, preventing redundant Prisma calls
 * in layout.tsx and page.tsx.
 */
export const getCachedUser = cache(async (userId: string) => {
    try {
        console.log(`[lib/users] Cache miss for user: ${userId}`);
        return await prisma.user.findUnique({
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
    } catch (error) {
        console.error('[lib/users] Error in getCachedUser:', error);
        return null;
    }
});

/**
 * Fallback to email search if ID mismatch occurs (common after DB resets)
 */
export const getCachedUserByEmail = cache(async (email: string) => {
    try {
        console.log(`[lib/users] Cache miss for email: ${email}`);
        return await prisma.user.findUnique({
            where: { email },
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
    } catch (error) {
        console.error('[lib/users] Error in getCachedUserByEmail:', error);
        return null;
    }
});
