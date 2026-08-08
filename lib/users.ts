import { cache } from 'react';
import { prisma } from '@/lib/prisma';
import { createClient } from '@supabase/supabase-js';

// Removed top-level supabaseAdmin to ensure runtime evaluation of Edge env vars

/**
 * Retrieves the full database user profile by Supabase ID.
 * Prefers Supabase HTTP lookup on Edge for stability.
 */
export const getCachedUser = cache(async (userId: string) => {
    const isEdge = !prisma;

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
                        schoolCode: true,
                        status: true, 
                        logoUrl: true,
                        address: true,
                        createdAt: true,
                        trialEndsAt: true,
                        stripeCustomerId: true,
                        stripeSubscriptionId: true,
                        subscriptionStatus: true,
                        _count: {
                            select: { students: true, users: true }
                        }
                    }
                },
                parentLinks: {
                    include: {
                        student: {
                            include: {
                                school: {
                                    select: {
                                        id: true,
                                        name: true,
                                        schoolCode: true,
                                        status: true,
                                        logoUrl: true,
                                        address: true,
                                        createdAt: true,
                                        trialEndsAt: true,
                                        stripeCustomerId: true,
                                        stripeSubscriptionId: true,
                                        subscriptionStatus: true,
                                        _count: { select: { students: true, users: true } }
                                    }
                                }
                            }
                        }
                    }
                },
                student: {
                    include: {
                        school: {
                            select: {
                                id: true,
                                name: true,
                                schoolCode: true,
                                status: true,
                                logoUrl: true,
                                address: true,
                                createdAt: true,
                                trialEndsAt: true,
                                stripeCustomerId: true,
                                stripeSubscriptionId: true,
                                subscriptionStatus: true,
                                _count: { select: { students: true, users: true } }
                            }
                        }
                    }
                }
            }
        });
        if (user) {
            let school = user.school;
            if (!school && user.parentLinks?.length > 0) {
                school = user.parentLinks[0]?.student?.school || null;
            }
            if (!school && user.student?.school) {
                school = user.student.school;
            }
            if (!school && (user.role === 'SUPERADMIN' || !user.schoolId)) {
                const firstSchool = await prisma.school.findFirst({
                    select: {
                        id: true,
                        name: true,
                        schoolCode: true,
                        status: true,
                        logoUrl: true,
                        address: true,
                        createdAt: true,
                        trialEndsAt: true,
                        stripeCustomerId: true,
                        stripeSubscriptionId: true,
                        subscriptionStatus: true,
                        _count: { select: { students: true, users: true } }
                    },
                    orderBy: { createdAt: 'asc' }
                });
                if (firstSchool) school = firstSchool;
            }
            return {
                ...user,
                school,
                schoolId: user.schoolId || school?.id || null
            };
        }
    } catch (error: any) {
        console.warn(`[lib/users] Prisma ID lookup skipped/failed: ${error.message}`);
    }

    return fetchUserFromSupabase(userId, 'id');
});

export const getCachedUserByEmail = cache(async (email: string) => {
    const isEdge = !prisma;

    if (isEdge) {
        return fetchUserFromSupabase(email, 'email');
    }

    try {
        if (!prisma) throw new Error("Prisma client not available");
        const user = await prisma.user.findUnique({
            where: { email },
            include: { 
                school: {
                    select: { 
                        id: true, 
                        name: true, 
                        schoolCode: true,
                        status: true, 
                        logoUrl: true,
                        address: true,
                        createdAt: true,
                        trialEndsAt: true,
                        stripeCustomerId: true,
                        stripeSubscriptionId: true,
                        subscriptionStatus: true,
                        _count: { 
                            select: { students: true, users: true } 
                        } 
                    }
                } 
            }
        });
        if (user) {
            let school = user.school;
            if (!school && (user.role === 'SUPERADMIN' || !user.schoolId)) {
                const firstSchool = await prisma.school.findFirst({
                    select: {
                        id: true,
                        name: true,
                        schoolCode: true,
                        status: true,
                        logoUrl: true,
                        address: true,
                        createdAt: true,
                        trialEndsAt: true,
                        stripeCustomerId: true,
                        stripeSubscriptionId: true,
                        subscriptionStatus: true,
                        _count: { select: { students: true, users: true } }
                    },
                    orderBy: { createdAt: 'asc' }
                });
                if (firstSchool) school = firstSchool;
            }
            return {
                ...user,
                school,
                schoolId: user.schoolId || school?.id || null
            };
        }
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

        let school = data.school ? {
            ...data.school,
            _count: { students: 0, users: 0 }
        } : null;

        // Fallback for PARENT linked via ParentStudentLink
        if (!school && data.role === 'PARENT') {
            const { data: parentLinks } = await supabaseAdmin
                .from('ParentStudentLink')
                .select('student:Student(school:School(*))')
                .eq('parentId', data.id)
                .limit(1);
            const studentObj = (parentLinks as any)?.[0]?.student;
            const schoolObj = Array.isArray(studentObj?.school) ? studentObj.school[0] : studentObj?.school;
            if (schoolObj) {
                school = {
                    ...schoolObj,
                    _count: { students: 0, users: 0 }
                };
            }
        }

        // Fallback for SUPERADMIN or missing school in Supabase
        if (!school && (data.role === 'SUPERADMIN' || !data.schoolId)) {
            const { data: firstSchool } = await supabaseAdmin
                .from('School')
                .select('*')
                .limit(1)
                .maybeSingle();
            if (firstSchool) {
                school = {
                    ...firstSchool,
                    _count: { students: 0, users: 0 }
                };
            }
        }

        return {
            ...data,
            school,
            schoolId: data.schoolId || school?.id || null
        };
    } catch (err: any) {
        console.error(`[lib/users] Supabase fetch failed for ${field}=${value}:`, err.message);
        return null;
    }
}
