/**
 * Cache Tags for LUCY ACADEMIA
 * Used with unstable_cache and revalidateTag for granular invalidation.
 */
export const CACHE_TAGS = {
    STUDENTS: 'school-students',
    CLASSES: 'school-classes',
    GRADES: 'school-grades',
    SCHOOL_CONFIG: 'school-config',
    DASHBOARD_ANALYTICS: 'dashboard-analytics',
    USER_PROFILE: 'user-profile',
    MESSAGES: 'school-messages',
    SCHOOL_ATTENDANCE: 'school-attendance',
    ASSIGNMENTS: 'school-assignments',
} as const;

export type CacheTag = typeof CACHE_TAGS[keyof typeof CACHE_TAGS];

/**
 * Utility to generate school-scoped tags
 */
export const getSchoolTag = (tag: CacheTag, schoolId: string) => `${tag}-${schoolId}`;
export const getUserTag = (userId: string) => `${CACHE_TAGS.USER_PROFILE}-${userId}`;
