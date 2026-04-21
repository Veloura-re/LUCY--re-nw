import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole, handleApiError } from '@/lib/security';

export async function GET(request: Request) {
    try {
        const dbUser = await requireRole(['STUDENT']);

        const student = await prisma.student.findUnique({
            where: { userId: dbUser.id }
        });

        if (!student) return NextResponse.json({ error: 'No student profile' }, { status: 400 });

        const records = await prisma.attendanceRecord.findMany({
            where: { studentId: student.id },
            orderBy: { date: 'desc' }
        });

        // Calculate stats
        const total = records.length;
        const present = records.filter(r => r.status === 'PRESENT').length;
        const late = records.filter(r => r.status === 'LATE').length;
        const absent = records.filter(r => r.status === 'ABSENT').length;
        const excused = records.filter(r => r.status === 'EXCUSED').length;

        const percentage = total > 0 ? ((present + late) / total) * 100 : 100;

        return NextResponse.json({
            records,
            stats: { total, present, late, absent, excused, percentage }
        });
    } catch (e) {
        return handleApiError(e);
    }
}
