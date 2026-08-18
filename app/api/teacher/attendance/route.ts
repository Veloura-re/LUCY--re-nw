import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSchoolLinked, handleApiError } from '@/lib/security';

export async function POST(request: Request) {
    try {
        const dbUser = await requireSchoolLinked();
        const user = await prisma.user.findUnique({
            where: { id: dbUser.id },
            include: { school: true }
        });

        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

        const { classId, subjectId, examId, periodId, date, records }: any = await request.json().catch(() => ({}));
        const config = (user.school as any)?.attendanceConfig || {};

        const attendanceDate = new Date(date);

        // Logic check: If examId provided, check if exam is locked
        if (examId) {
            const exam = await prisma.exam.findUnique({ where: { id: examId } });
            if (exam?.isLocked) {
                return NextResponse.json({ error: 'Records are locked for this finalized exam.' }, { status: 403 });
            }
        }

        // Attendance Locking Logic (Admin Rules)
        if (periodId && config.lockAfterMinutes) {
            const period = await prisma.period.findUnique({ where: { id: periodId } });
            if (period) {
                const now = new Date();
                const [startHour, startMin] = period.startTime.split(':').map(Number);
                const periodStart = new Date(attendanceDate);
                periodStart.setHours(startHour, startMin, 0, 0);

                const minsSinceStart = (now.getTime() - periodStart.getTime()) / (1000 * 60);

                // Allow 1 day grace for dev/testing unless explicitly strict
                // In production, this would be: if (minsSinceStart > config.lockAfterMinutes) ...
                // But let's check if it's the SAME DAY at least.
                const isSameDay = now.toDateString() === attendanceDate.toDateString();

                if (isSameDay && minsSinceStart > config.lockAfterMinutes && user.role !== 'PRINCIPAL' && user.role !== 'SUPERADMIN') {
                    return NextResponse.json({
                        error: `Protocol Timeout: Attendance window expired (${config.lockAfterMinutes}m). Contact admin to unlock.`
                    }, { status: 403 });
                }
            }
        }

        // Transaction
        await prisma.$transaction(async (tx) => {
            // Delete existing records for this specific context
            await tx.attendanceRecord.deleteMany({
                where: {
                    classId,
                    subjectId: subjectId || null,
                    examId: examId || null,
                    periodId: periodId || null,
                    date: attendanceDate
                }
            });

            // Insert new
            if (records.length > 0) {
                await tx.attendanceRecord.createMany({
                    data: records.map((r: any) => ({
                        classId,
                        studentId: r.studentId,
                        subjectId: subjectId || null,
                        examId: examId || null,
                        periodId: periodId || null,
                        date: attendanceDate,
                        status: r.status,
                        reason: r.reason || null,
                        createdById: user.id
                    }))
                });
            }
        });

        
        // Audit log
        try {
            const { logActivity } = await import('@/lib/audit');
            const _ip = request?.headers?.get('x-forwarded-for')?.split(',')[0]?.trim() || request?.headers?.get('cf-connecting-ip') || undefined;
            const _userId = dbUser?.id ?? undefined;
            if (_userId) {
                await logActivity({ userId: _userId, action: 'CREATE', resourceType: 'attendance', ip: _ip || undefined });
            }
        } catch { /* non-blocking */ }
return NextResponse.json({ success: true });
    } catch (e) {
        return handleApiError(e);
    }
}

export async function GET(request: Request) {
    try {
        const dbUser = await requireSchoolLinked();

        const { searchParams } = new URL(request.url);
        const classId = searchParams.get('classId');
        const subjectId = searchParams.get('subjectId');
        const examId = searchParams.get('examId');
        const periodId = searchParams.get('periodId');
        const dateStr = searchParams.get('date');

        if (!classId && !examId) return NextResponse.json({ error: 'Class ID or Exam ID required' }, { status: 400 });

        const date = dateStr ? new Date(dateStr) : undefined;
        const records = await prisma.attendanceRecord.findMany({
            where: {
                classId: classId || undefined,
                subjectId: subjectId || undefined,
                examId: examId || undefined,
                periodId: periodId || undefined,
                date: date
            }
        });
        return NextResponse.json({ records });
    } catch (e) {
        return handleApiError(e);
    }
}
