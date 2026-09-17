import { prisma } from '@/lib/prisma';
import { unstable_cache } from 'next/cache';
import { CACHE_TAGS, getSchoolTag } from '@/lib/cache-keys';
import { createClient } from '@supabase/supabase-js';

// Helper to get supabase client on Edge
const getSupabase = () => {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
        throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for privileged operations.");
    }
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );
};

/**
 * Fetch all subjects for a school with caching.
 */
export const getCachedSchoolSubjects = (schoolId: string) => {
    return unstable_cache(
        async () => {
const isEdge = !prisma;

            if (isEdge) {
                const supabase = getSupabase();
                const { data } = await supabase
                    .from('Subject')
                    .select('*')
                    .eq('schoolId', schoolId)
                    .order('name', { ascending: true });
                return data || [];
            }

            // Node.js Prisma Fallback
            return await prisma.subject.findMany({
                where: { schoolId },
                orderBy: { name: 'asc' }
            });
        },
        [`school-subjects-${schoolId}`],
        {
            tags: [getSchoolTag(CACHE_TAGS.CLASSES, schoolId), 'school-curriculum'],
            revalidate: 3600 // Cache for 1 hour
        }
    )();
};
