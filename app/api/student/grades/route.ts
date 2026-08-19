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

        // Fetch student details for class-level exams
        const targetStudent = await prisma.student.findUnique({
            where: { id: studentIdToFetch },
            select: { classId: true, firstName: true, lastName: true }
        });

        let allClassExams: any[] = [];
        let studentAttendance: any[] = [];

        if (targetStudent?.classId) {
            allClassExams = await prisma.exam.findMany({
                where: {
                    classId: targetStudent.classId,
                    dueAt: { lt: new Date() },
                    isPublished: true
                },
                include: { subject: true }
            });

            studentAttendance = await prisma.attendanceRecord.findMany({
                where: {
                    studentId: studentIdToFetch,
                    examId: { in: allClassExams.map(e => e.id) }
                }
            });
        }

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

            const max = r.exam?.totalMarks || (r.exam?.config as any)?.maxScore || 100;
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

        // Add unsubmitted past-due exams as 0 unless excused
        const gradedExamIds = new Set(records.map(r => r.examId).filter(Boolean));
        allClassExams.forEach(exam => {
            if (!gradedExamIds.has(exam.id)) {
                const att = studentAttendance.find(a => a.examId === exam.id);
                if (att?.status === 'EXCUSED') {
                    return;
                }

                if (!grouped[exam.subjectId]) {
                    grouped[exam.subjectId] = {
                        subjectId: exam.subjectId,
                        subjectName: exam.subject.name,
                        exams: [],
                        totalScore: 0,
                        totalMax: 0
                    };
                }

                const max = exam.totalMarks || (exam.config as any)?.maxScore || 100;

                grouped[exam.subjectId].exams.push({
                    id: `missed-${exam.id}`,
                    title: exam.title,
                    date: exam.dueAt || exam.createdAt,
                    score: 0,
                    maxScore: max,
                    remark: "Missed / Unsubmitted",
                    attempt: null
                });

                grouped[exam.subjectId].totalScore += 0;
                grouped[exam.subjectId].totalMax += Number(max);
            }
        });

        const result = Object.values(grouped).map((g: any) => ({
            ...g,
            average: g.totalMax > 0 ? (g.totalScore / g.totalMax) * 100 : 0
        }));

        return NextResponse.json({
            grouped: result,
            studentName: targetStudent ? `${targetStudent.firstName} ${targetStudent.lastName}` : null
        });
    } catch (e) {
        return handleApiError(e);
    }
}
