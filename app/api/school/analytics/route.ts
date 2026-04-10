import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole, handleApiError } from '@/lib/security';
import { getSchoolAnalytics } from '@/lib/dashboard-data';

export async function GET(request: Request) {
    try {
        const dbUser = await requireRole(['PRINCIPAL', 'SUPERADMIN']);
        // Use the centralized, cached analytics utility to ensure logic consistency
        const analytics = await getSchoolAnalytics(dbUser.schoolId!);

        // Special handling for teacher workload which isn't in the main aggregator yet
        const teacherWorkload = await prisma.user.findMany({
            where: { schoolId: dbUser.schoolId!, role: { in: ['TEACHER', 'HOMEROOM'] } },
            select: {
                name: true,
                _count: {
                    select: { teacherAssignments: true, timetable: true }
                }
            }
        });

        return NextResponse.json({
            ...analytics,
            teacherWorkload: teacherWorkload.map(t => ({
                name: t.name,
                assignments: t._count.teacherAssignments,
                periods: t._count.timetable
            }))
        });

    } catch (e) {
        return handleApiError(e);
    }
}

