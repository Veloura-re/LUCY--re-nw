import { prisma } from '@/lib/prisma';
import { unstable_cache } from 'next/cache';
import { CACHE_TAGS, getSchoolTag } from '@/lib/cache-keys';
import { createClient } from '@supabase/supabase-js';

// Helper to get supabase client on Edge
const getSupabase = () => {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
};

/**
 * Fetch all classes and grades in a school with caching.
 */
export const getCachedSchoolStructure = (schoolId: string) => {
    return unstable_cache(
        async () => {
const isEdge = !prisma;

            if (isEdge) {
                const supabase = getSupabase();
                const { data } = await supabase
                    .from('Grade')
                    .select('*, classes:Class(*)')
                    .eq('schoolId', schoolId)
                    .order('level', { ascending: true });
                
                return (data || []).map((g: any) => ({
                    ...g,
                    classes: (g.classes || []).map((c: any) => ({
                        ...c,
                        _count: { students: 0, assignments: 0 }
                    }))
                }));
            }

            // Node.js Prisma Fallback
            return await prisma.grade.findMany({
                where: { schoolId },
                include: {
                    classes: {
                        include: {
                            _count: { 
                                select: { 
                                    students: true,
                                    assignments: true
                                } 
                            },
                        }
                    }
                },
                orderBy: { level: 'asc' }
            });
        },
        [getSchoolTag(CACHE_TAGS.CLASSES, schoolId)],
        {
            tags: [getSchoolTag(CACHE_TAGS.CLASSES, schoolId), getSchoolTag(CACHE_TAGS.GRADES, schoolId)],
            revalidate: 3600 // Classes change less often, cache for 1 hour
        }
    )();
};

/**
 * Fetch school-wide configuration and branding.
 */
export const getCachedSchoolConfig = (schoolId: string) => {
    return unstable_cache(
        async () => {
const isEdge = !prisma;

            if (isEdge) {
                const supabase = getSupabase();
                const { data } = await supabase
                    .from('School')
                    .select('id, name, status, logoUrl, address')
                    .eq('id', schoolId)
                    .single();
                return data;
            }

            // Node.js Prisma Fallback
            return await prisma.school.findUnique({
                where: { id: schoolId },
                select: {
                    id: true,
                    name: true,
                    status: true,
                    logoUrl: true,
                    address: true
                }
            });
        },
        [getSchoolTag(CACHE_TAGS.SCHOOL_CONFIG, schoolId)],
        {
            tags: [getSchoolTag(CACHE_TAGS.SCHOOL_CONFIG, schoolId)],
            revalidate: 86400 // Daily cache for static config
        }
    )();
};
