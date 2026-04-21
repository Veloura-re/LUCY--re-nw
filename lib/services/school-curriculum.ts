import { prisma } from '@/lib/prisma';
import { unstable_cache } from 'next/cache';
import { CACHE_TAGS, getSchoolTag } from '@/lib/cache-keys';

/**
 * Fetch all subjects for a school with caching.
 */
export const getCachedSchoolSubjects = (schoolId: string) => {
    return unstable_cache(
        async () => {
            console.log(`[lib/services/school] Cache MISS for subjects: ${schoolId}`);
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
