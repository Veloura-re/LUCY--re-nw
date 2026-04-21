import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSchoolLinked, handleApiError } from '@/lib/security';

export async function GET(request: Request) {
    try {
        const dbUser = await requireSchoolLinked();
        const { searchParams } = new URL(request.url);
        const targetStudentId = searchParams.get('studentId');

        // Authorization Logic
        let studentIdToFetch: string | null = null;

        if (dbUser.role === 'PARENT') {
            if (targetStudentId) {
                // Check if parent is linked to this student
                const parentLinks = await prisma.parentStudentLink.findMany({
                    where: { parentId: dbUser.id }
                });
                const isLinked = parentLinks.some(link => link.studentId === targetStudentId);
                if (!isLinked) return NextResponse.json({ error: 'Forbidden - Student not linked' }, { status: 403 });
                studentIdToFetch = targetStudentId;
            } else {
                return NextResponse.json({ error: 'Missing studentId' }, { status: 400 });
            }
        } else if (dbUser.role === 'STUDENT') {
            const student = await prisma.student.findFirst({ where: { userId: dbUser.id } });
            // Students can only see themselves
            if (targetStudentId && targetStudentId !== student?.id) {
                return NextResponse.json({ error: 'Forbidden - You cannot view other students' }, { status: 403 });
            }
            studentIdToFetch = student?.id || null;
        } else {
            // Staff roles
            const student = await prisma.student.findFirst({ where: { userId: dbUser.id } });
            studentIdToFetch = targetStudentId || student?.id || null;

            // Ensure staff only sees students in their school
            if (studentIdToFetch) {
                const targetStudent = await prisma.student.findUnique({
                    where: { id: studentIdToFetch },
                    select: { schoolId: true }
                });
                if (targetStudent?.schoolId !== dbUser.schoolId) {
                    return NextResponse.json({ error: 'Forbidden - Student outside school boundary' }, { status: 403 });
                }
            }
        }

        if (!studentIdToFetch) return NextResponse.json({ error: 'No student profile target identified' }, { status: 400 });

        const records = await prisma.gradeRecord.findMany({
            where: { studentId: studentIdToFetch },
            include: {
                exam: true,
                subject: true
            },
            orderBy: { createdAt: 'desc' }
        });

        // Fetch ExamAttempts for these exams to get detailed feedback
        const examIds = records.map(r => r.examId).filter(Boolean) as string[];
        const attempts = await prisma.examAttempt.findMany({
            where: {
                studentId: studentIdToFetch,
                examId: { in: examIds }
            }
        });

        // Fetch student name for the header if viewing as parent/staff
        const student = await prisma.student.findUnique({
            where: { id: studentIdToFetch },
            select: { firstName: true, lastName: true }
        });

        // Group by Subject
        const grouped: any = {};
        records.forEach(r => {
            if (!grouped[r.subjectId]) {
                grouped[r.subjectId] = {
                    subjectId: r.subjectId,
                    subjectName: r.subject.name,
                    exams: [],
                    totalScore: 0,
                    totalMax: 0
                };
            }

            const max = r.exam?.config ? (r.exam.config as any).maxScore || 100 : 100;
            const attempt = attempts.find(a => a.examId === r.examId);

            grouped[r.subjectId].exams.push({
                id: r.id,
                title: r.exam?.title || "Assignment",
                date: r.createdAt,
                score: r.score,
                maxScore: max,
                remark: r.remark,
                attempt: attempt ? {
                    id: attempt.id,
                    answers: attempt.answers,
                    metadata: (attempt as any).metadata,
                    questions: r.exam?.questions
                } : null
            });

            grouped[r.subjectId].totalScore += Number(r.score);
            grouped[r.subjectId].totalMax += Number(max);
        });

        const result = Object.values(grouped).map((g: any) => ({
            ...g,
            average: g.totalMax > 0 ? (g.totalScore / g.totalMax) * 100 : 0
        }));

        return NextResponse.json({
            grouped: result,
            studentName: student ? `${student.firstName} ${student.lastName}` : null
        });
    } catch (e) {
        return handleApiError(e);
    }
}
