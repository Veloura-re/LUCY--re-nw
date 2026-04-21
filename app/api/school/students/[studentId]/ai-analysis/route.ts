import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { analyzeStudentRisk } from '@/lib/ai';

export async function GET(
    request: Request,
<<<<<<< HEAD
    { params }: { params: { studentId: string } }
) {
    try {
        const student = await prisma.student.findUnique({
            where: { id: params.studentId },
=======
    { params }: { params: Promise<{ studentId: string }> }
) {
    try {
        const { studentId } = await params;
        const student = await prisma.student.findUnique({
            where: { id: studentId },
>>>>>>> dd98834c9a006342647ee3b70627d513ddc6e533
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

        const analysis = await analyzeStudentRisk(aiContext);

        return NextResponse.json({ analysis });

    } catch (error: any) {
        console.error('[AI Analysis Error]', error);
        return NextResponse.json({ error: 'Failed to generate AI analysis', details: error.message }, { status: 500 });
    }
}
