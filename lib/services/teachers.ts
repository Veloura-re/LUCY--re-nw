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
 * Fetch a unified teacher registry for a school with caching.
 */
export const getCachedTeacherRegistry = (schoolId: string) => {
    return unstable_cache(
        async () => {
            const { prisma: _prismaCheck } = require('@/lib/prisma');
            const isEdge = !_prismaCheck;

            if (isEdge) {
                const supabase = getSupabase();
                
                // 1. Get All Teachers associated with this school
                const { data: users } = await supabase
                    .from('User')
                    .select('id, name, email, phone, teacherCode, qualification, gender, photoUrl, createdAt, verified')
                    .eq('schoolId', schoolId)
                    .in('role', ['TEACHER', 'HOMEROOM']);

                // 2. Get All Pending Tokens
                const { data: invites } = await supabase
                    .from('InviteToken')
                    .select('*')
                    .eq('schoolId', schoolId)
                    .in('role', ['TEACHER', 'HOMEROOM'])
                    .is('usedAt', null);

                const teacherList = users || [];
                const inviteList = invites || [];

                // 3. Format Teachers
                const formattedTeachers = teacherList.map(u => {
                    const invite = inviteList.find(i => i.email === u.email);
                    return {
                        ...u,
                        token: invite?.token || null,
                        status: u.verified ? 'ACTIVE' : 'PENDING'
                    };
                });

                // 4. Also include Invites that don't have a User record yet
                const orphanedInvites = inviteList
                    .filter(i => !teacherList.find(u => u.email === i.email))
                    .map(i => ({
                        id: i.id,
                        name: null,
                        email: i.email,
                        token: i.token,
                        createdAt: i.createdAt,
                        status: 'PENDING'
                    }));

                return [...formattedTeachers, ...orphanedInvites].sort((a, b) =>
                    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                );
            }

            // Node.js Prisma Fallback
            const { prisma } = require('@/lib/prisma');
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

            const invites = await prisma.inviteToken.findMany({
                where: {
                    schoolId,
                    role: { in: ['TEACHER', 'HOMEROOM'] },
                    usedAt: null
                }
            });

            const formattedTeachers = users.map(u => {
                const invite = invites.find(i => i.email === u.email);
                return {
                    ...u,
                    token: invite?.token || null,
                    status: u.verified ? 'ACTIVE' : 'PENDING'
                };
            });

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

            return [...formattedTeachers, ...orphanedInvites].sort((a, b) =>
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );
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
            const { prisma: _prismaCheck } = require('@/lib/prisma');
            const isEdge = !_prismaCheck;

            if (isEdge) {
                const supabase = getSupabase();
                const { data } = await supabase
                    .from('School')
                    .select('name, address, logoUrl')
                    .eq('id', schoolId)
                    .single();
                return data;
            }

            // Node.js Prisma Fallback
            const { prisma } = require('@/lib/prisma');
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
