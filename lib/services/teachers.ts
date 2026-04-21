import { prisma } from '@/lib/prisma';
import { unstable_cache } from 'next/cache';
import { CACHE_TAGS, getSchoolTag } from '@/lib/cache-keys';

/**
 * Fetch a unified teacher registry for a school with caching.
 * Merges active users and pending invitation tokens.
 */
export const getCachedTeacherRegistry = (schoolId: string) => {
    return unstable_cache(
        async () => {
            console.log(`[lib/services/teachers] Cache MISS for teacher registry: ${schoolId}`);

            // 1. Get All Teachers associated with this school
            const users = await prisma.user.findMany({
                where: {
                    schoolId,
                    role: { in: ['TEACHER', 'HOMEROOM'] }
                },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    phone: true,
                    teacherCode: true,
                    qualification: true,
                    gender: true,
                    photoUrl: true,
                    createdAt: true,
                    verified: true
                }
            });

            // 2. Get All Pending Tokens
            const invites = await prisma.inviteToken.findMany({
                where: {
                    schoolId,
                    role: 'TEACHER',
                    usedAt: null
                }
            });

            // 3. Format Teachers - those with User record and verified=true are ACTIVE, else PENDING
            const formattedTeachers = users.map(u => {
                const invite = invites.find(i => i.email === u.email);
                return {
                    ...u,
                    token: invite?.token || null,
                    status: u.verified ? 'ACTIVE' : 'PENDING'
                };
            });

            // 4. Also include Invites that don't have a User record yet
            const orphanedInvites = invites
                .filter(i => !users.find(u => u.email === i.email))
                .map(i => ({
                    id: i.id,
                    name: null,
                    email: i.email,
                    token: i.token,
                    createdAt: i.createdAt,
                    status: 'PENDING'
                }));

            const all = [...formattedTeachers, ...orphanedInvites].sort((a, b) =>
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );

            return all;
        },
        [`teacher-registry-${schoolId}`],
        {
            tags: [getSchoolTag(CACHE_TAGS.USER_PROFILE, schoolId), 'school-staff'],
            revalidate: 3600 // Cache for 1 hour
        }
    )();
};

/**
 * Fetch basic school info for the registry view.
 */
export const getCachedSchoolInfoForRegistry = (schoolId: string) => {
    return unstable_cache(
        async () => {
            return await prisma.school.findUnique({
                where: { id: schoolId },
                select: { name: true, address: true, logoUrl: true }
            });
        },
        [`school-info-registry-${schoolId}`],
        {
            tags: [getSchoolTag(CACHE_TAGS.SCHOOL_CONFIG, schoolId)],
            revalidate: 3600
        }
    )();
};
