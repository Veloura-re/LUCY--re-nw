import { prisma } from '@/lib/prisma';
import { unstable_cache } from 'next/cache';
import { CACHE_TAGS, getSchoolTag } from '@/lib/cache-keys';

/**
 * Fetch all teachers for a school with caching.
 */
export const getCachedSchoolTeachers = (schoolId: string) => {
    return unstable_cache(
        async () => {
            console.log(`[lib/services/teachers] Cache MISS for teachers: ${schoolId}`);
            return await prisma.user.findMany({
                where: { 
                    schoolId, 
                    role: { in: ['TEACHER', 'HOMEROOM'] } 
                },
                select: { id: true, name: true, email: true, role: true },
                orderBy: { name: 'asc' }
            });
        },
        [`school-teachers-${schoolId}`],
        {
            tags: [getSchoolTag(CACHE_TAGS.USER_PROFILE, schoolId), 'school-staff'],
            revalidate: 3600 // Cache for 1 hour
        }
    )();
};
