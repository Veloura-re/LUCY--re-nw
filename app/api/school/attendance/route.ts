import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { AttendanceStatus } from '@prisma/client';
import { requireSchoolLinked, handleApiError } from '@/lib/security';
import { sendLatenessNotificationEmail } from '@/lib/email';

export async function GET(request: Request) {
    try {
        const user = await requireSchoolLinked();

        const { searchParams } = new URL(request.url);
        const classId = searchParams.get('classId');
        const date = searchParams.get('date');
        const subjectId = searchParams.get('subjectId');
        const periodId = searchParams.get('periodId');

        if (!classId || !date) {
            return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
        }

        const attendanceDate = new Date(date);
        attendanceDate.setHours(0, 0, 0, 0);

        const attendance = await prisma.attendanceRecord.findMany({
            where: {
                classId,
                class: { grade: { schoolId: user.schoolId! } },
                date: attendanceDate,
                ...(subjectId ? { subjectId } : { subjectId: null }),
                ...(periodId ? { periodId } : { periodId: null }),
            }
        });

        // Also fetch any approved authorizations for this date
        const authorizations = await (prisma as any).absenceAuthorization.findMany({
            where: {
                student: { classId, schoolId: user.schoolId! },
                status: 'APPROVED',
                startDate: { lte: attendanceDate },
                endDate: { gte: attendanceDate }
            },
            select: {
                studentId: true,
                reason: true
            }
        });

        return NextResponse.json({ attendance, authorizations });
    } catch (e) {
        return handleApiError(e);
    }
}

export async function POST(request: Request) {
    try {
        const authUser = await requireSchoolLinked();

        const user = await prisma.user.findUnique({
            where: { id: authUser.id },
            include: { school: true }
        });
        if (!user || !user.schoolId) return NextResponse.json({ error: 'No school linked' }, { status: 400 });

        const body = await request.json();
        const { classId, date, subjectId, periodId, examId, records, seal } = body;

        const attendanceDate = new Date(date);
        attendanceDate.setHours(0, 0, 0, 0);

        const config = (user.school as any)?.attendanceConfig || {};

        // 1. Exam Locking Logic
        if (examId) {
            const exam = await prisma.exam.findUnique({ where: { id: examId } });
            if (exam?.isLocked) {
                return NextResponse.json({ error: 'Records are locked for this finalized exam.' }, { status: 403 });
            }
        }

        // 2. Attendance Locking Logic (Operational Window)
        if (periodId && config.lockAfterMinutes) {
            const period = await prisma.period.findUnique({ where: { id: periodId } });
            if (period) {
                const now = new Date();
                const [startHour, startMin] = period.startTime.split(':').map(Number);
                const periodStart = new Date(attendanceDate);
                periodStart.setHours(startHour, startMin, 0, 0);

                const minsSinceStart = (now.getTime() - periodStart.getTime()) / (1000 * 60);
                const isSameDay = now.toDateString() === attendanceDate.toDateString();

                if (isSameDay && minsSinceStart > config.lockAfterMinutes && !['PRINCIPAL', 'SUPERADMIN'].includes(user.role)) {
                    return NextResponse.json({
                        error: `Protocol Timeout: Attendance window expired (${config.lockAfterMinutes}m). Contact admin to unlock.`
                    }, { status: 403 });
                }
            }
        }

        // 3. Manual Sealing Lock Check
        const existingLocked = await prisma.attendanceRecord.findFirst({
            where: {
                classId,
                date: attendanceDate,
                subjectId: subjectId || null,
                periodId: periodId || null,
                examId: examId || null,
                isLocked: true
            }
        });

        if (existingLocked && !['PRINCIPAL', 'SUPERADMIN'].includes(user.role)) {
            return NextResponse.json({
                error: 'Institutional Protocol: This log has been sealed and cannot be modified by staff. Contact administration for overrides.'
            }, { status: 403 });
        }

        // 4. Atomic Update via Transaction
        await prisma.$transaction(async (tx) => {
            // Purge existing records for this specific metadata
            await tx.attendanceRecord.deleteMany({
                where: {
                    classId,
                    class: { grade: { schoolId: user.schoolId! } },
                    date: attendanceDate,
                    subjectId: subjectId || null,
                    periodId: periodId || null,
                    examId: examId || null
                }
            });

            // Bulk Insert new records
            if (records.length > 0) {
                await tx.attendanceRecord.createMany({
                    data: records.map((record: any) => ({
                        studentId: record.studentId,
                        classId,
                        subjectId: subjectId || null,
                        periodId: periodId || null,
                        examId: examId || null,
                        date: attendanceDate,
                        status: record.status,
                        reason: record.reason || null,
                        createdById: user.id,
                        isLocked: (seal === true),
                        lockedAt: (seal === true) ? new Date() : null,
                        lockedById: (seal === true) ? user.id : null
                    }))
                });
            }
        });

        // 5. Asynchronous Notification Dispatch
        const lateRecords = records.filter((r: any) => r.status === 'LATE');
        if (lateRecords.length > 0) {
            // FIRE AND FORGET: Do not await to avoid blocking the API response
            (async () => {
                try {
                    for (const record of lateRecords) {
                        const student = await prisma.student.findUnique({
                            where: { id: record.studentId },
                            include: {
                                parentLinks: { include: { parent: true } },
                                attendanceRecords: { where: { status: 'LATE' } }
                            }
                        });

                        if (!student || !student.parentLinks.length) continue;

                        const totalLates = student.attendanceRecords.length;
                        const dateString = attendanceDate.toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                        });

                        for (const link of student.parentLinks) {
                            if (link.parent.email) {
                                await sendLatenessNotificationEmail(
                                    link.parent.email,
                                    `${student.firstName} ${student.lastName}`,
                                    dateString,
                                    totalLates,
                                    user.schoolId!
                                );
                            }
                        }
                    }
                } catch (err) {
                    console.error('Attendance Notification Sync Error:', err);
                }
            })();
        }

        return NextResponse.json({ success: true, count: records.length });

    } catch (e) {
        return handleApiError(e);
    }
}
