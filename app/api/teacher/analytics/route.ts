import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole, handleApiError } from '@/lib/security';

export async function GET(request: Request) {
    try {
        const dbUser = await requireRole(['TEACHER', 'HOMEROOM', 'PRINCIPAL']);

        // Fetch teacher's classes
        const assignments = await prisma.teacherAssignment.findMany({
            where: { teacherId: dbUser.id },
            select: { classId: true }
        });

        const classIds = assignments.map(a => a.classId);

        // Consolidate attendance counting into a single groupBy query
        const attendanceStats = await prisma.attendanceRecord.groupBy({
            by: ['status'],
            where: { classId: { in: classIds } },
            _count: true
        });

        const statsMap = Object.fromEntries(
            attendanceStats.map(stat => [stat.status, stat._count])
        );

        const total = Object.values(statsMap).reduce((a, b) => a + b, 0);
        const present = (statsMap['PRESENT'] || 0) + (statsMap['LATE'] || 0);

        // "Missing records" logic: can be further refined here if needed
        const missingCount = 0;

        return NextResponse.json({
            attendanceRate: total > 0 ? `${((present / total) * 100).toFixed(0)}%` : "100%",
            missingCount
        });

    } catch (e) {
        return handleApiError(e);
    }
}
