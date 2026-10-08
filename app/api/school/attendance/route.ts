import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSchoolLinked, handleApiError } from '@/lib/security';
import { sendLatenessNotificationEmail } from '@/lib/email';
import { revalidateTag } from 'next/cache';
import { CACHE_TAGS, getSchoolTag } from '@/lib/cache-keys';
import { getAttendanceSystem } from '@/lib/services/attendance';
import { logActivity, getIp } from '@/lib/audit';

export async function GET(request: Request) {
    try {
        const user = await requireSchoolLinked();

        const { searchParams } = new URL(request.url);
        const classId = searchParams.get('classId');
        const date = searchParams.get('date');
        const subjectId = searchParams.get('subjectId') || undefined;
        const periodId = searchParams.get('periodId') || undefined;

        if (!classId || !date) {
            return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
        }

        const data = await getAttendanceSystem(user.schoolId!, classId, date, subjectId, periodId);

        return NextResponse.json(data);
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

        const body = (await request.json().catch(() => ({}))) as any;
        const { classId, date, subjectId, periodId, examId, records, seal } = body;

        const attendanceDate = new Date(date);
        attendanceDate.setHours(0, 0, 0, 0);

        const config = (user.school as any)?.attendanceConfig || {};

        // Late Marking Capability Protocol Check
        if (config.enableLateMarking === false && records?.some((r: any) => r.status === 'LATE')) {
            return NextResponse.json({
                error: 'Institutional Protocol: Late marking is disabled by institutional policy.'
            }, { status: 400 });
        }

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
            const periodStartTime = period?.startTime;
            
            if (periodStartTime) {
                const now = new Date();
                const [startHour, startMin] = periodStartTime.split(':').map(Number);
                const periodStart = new Date(attendanceDate);
                periodStart.setHours(startHour, startMin, 0, 0);

                const minsSinceStart = (now.getTime() - periodStart.getTime()) / (1000 * 60);
                const isSameDay = now.toDateString() === attendanceDate.toDateString();

                if (isSameDay && minsSinceStart > config.lockAfterMinutes && !['OWNER', 'PRINCIPAL', 'SUPERADMIN'].includes(user.role)) {
                    return NextResponse.json({
                        error: `Protocol Timeout: Attendance window expired (${config.lockAfterMinutes}m). Contact admin to unlock.`
                    }, { status: 403 });
                }
            }
        }

        // 3. Manual Sealing Lock Check
        const record = await prisma.attendanceRecord.findFirst({
            where: {
                classId,
                date: attendanceDate,
                subjectId: subjectId || null,
                periodId: periodId || null,
                examId: examId || null,
                isLocked: true
            }
        });

        if (record && !['OWNER', 'PRINCIPAL', 'SUPERADMIN'].includes(user.role)) {
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
            if (records && records.length > 0) {
                await tx.attendanceRecord.createMany({
                    data: records.map((rec: any) => ({
                        studentId: rec.studentId,
                        classId,
                        subjectId: subjectId || null,
                        periodId: periodId || null,
                        examId: examId || null,
                        date: attendanceDate,
                        status: rec.status,
                        reason: rec.reason || null,
                        createdById: user.id,
                        isLocked: (seal === true),
                        lockedAt: (seal === true) ? new Date() : null,
                        lockedById: (seal === true) ? user.id : null
                    }))
                });
            }
        });

        // Trigger Cache Invalidation for the attendance system
        try {
            revalidateTag(getSchoolTag(CACHE_TAGS.SCHOOL_ATTENDANCE, user.schoolId), 'max');
        } catch { /* non-blocking */ }

        // 5. Asynchronous Notification Dispatch
        const lateRecords = (records || []).filter((r: any) => r.status === 'LATE');
        if (lateRecords.length > 0) {
            (async () => {
                try {
                    for (const rec of lateRecords) {
                        const student = await prisma.student.findUnique({
                            where: { id: rec.studentId },
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

        // Multi-Tenant Audit log invariant
        try {
            const clientIp = getIp(request);
            await logActivity({
                userId: user.id,
                schoolId: user.schoolId,
                action: 'CREATE_ATTENDANCE',
                resourceType: 'attendance',
                ip: clientIp
            });
        } catch { /* non-blocking */ }

        return NextResponse.json({ success: true, count: records?.length || 0 });

    } catch (e) {
        return handleApiError(e);
    }
}
