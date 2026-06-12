import { unstable_cache } from 'next/cache';
import { CACHE_TAGS, getSchoolTag } from '@/lib/cache-keys';
import { createClient } from '@supabase/supabase-js';
import { prisma as globalPrisma } from '@/lib/prisma'; // Ensure webpack bundles prisma

// Helper to get supabase client on Edge
const getSupabase = () => {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
};

/**
 * Fetch all subjects for a school with caching.
 */
export const getCachedSchoolSubjects = (schoolId: string) => {
    return unstable_cache(
        async () => {
            const { prisma: _prismaCheck } = require('@/lib/prisma');
            const isEdge = !_prismaCheck;

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
            const { prisma } = require('@/lib/prisma');
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
