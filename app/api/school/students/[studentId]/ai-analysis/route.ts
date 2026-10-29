import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { analyzeStudentRisk } from '@/lib/ai';
import { createAiObservationContext } from '@/lib/ai-observability';
import { handleApiError, requireStudentAccess } from '@/lib/security';
import { rateLimitShared } from '@/lib/rate-limit';
import { logActivity, getIp } from '@/lib/audit';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ studentId: string }> }
) {
    try {
        const limited = await rateLimitShared(request, 'school/students/ai-analysis', 10);
        if (limited) return limited;

        const { studentId } = await params;
        const { user, student: access } = await requireStudentAccess(studentId);

        const student = await prisma.student.findUnique({
            where: { id: access.id },
            include: {
                attendanceRecords: {
                    orderBy: { date: 'desc' },
                    take: 30, // Last 30 attendance records
                },
                gradeRecords: {
                    include: { subject: true, exam: true },
                    orderBy: { createdAt: 'desc' },
                    take: 20
                },
                remarks: {
                    orderBy: { createdAt: 'desc' },
                    take: 10
                },
                internalNotes: {
                    orderBy: { createdAt: 'desc' },
                    take: 5
                }
            }
        });

        if (!student) {
            return NextResponse.json({ error: 'Student not found' }, { status: 404 });
        }

        // Simplify and scrub data for the AI context to save tokens
        const aiContext = {
            name: `${student.firstName} ${student.lastName}`,
            enrollmentStatus: student.enrollmentStatus,
            recentAttendance: student.attendanceRecords.map(a => ({ date: a.date, status: a.status })),
            recentGrades: student.gradeRecords.map(g => ({ subject: g.subject.name, exam: g.exam.title, score: g.score, remark: g.remark })),
            teacherRemarks: student.remarks.map(r => r.content),
            internalNotes: student.internalNotes.map(n => n.content)
        };

        const analysis = await analyzeStudentRisk(aiContext, createAiObservationContext({ distinctId: user.id, spanName: 'student_risk_analysis' }));

        await logActivity({
            userId: user.id,
            schoolId: access.schoolId,
            action: 'AI_STUDENT_ANALYSIS',
            resourceType: 'student',
            resourceId: access.id,
            ip: getIp(request)
        });

        return NextResponse.json({ analysis });

    } catch (error: any) {
        return handleApiError(error);
    }
}
