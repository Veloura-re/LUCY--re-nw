import { prisma } from '@/lib/prisma';
import { unstable_cache } from 'next/cache';
import { CACHE_TAGS, getSchoolTag } from '@/lib/cache-keys';

/**
 * Fetch all classes and grades in a school with caching.
 */
export const getCachedSchoolStructure = (schoolId: string) => {
    return unstable_cache(
        async () => {
            console.log(`[lib/services/school] Cache MISS for structure: ${schoolId}`);
            
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
            console.log(`[lib/services/school] Cache MISS for config: ${schoolId}`);
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
