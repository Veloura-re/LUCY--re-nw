import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSchoolLinked, handleApiError } from '@/lib/security';

export async function POST(request: Request) {
    try {
        const dbUser = await requireSchoolLinked();
        if (dbUser.role !== 'STUDENT') {
            return NextResponse.json({ error: 'Only students can submit exams' }, { status: 403 });
        }

        const { examId, answers } = await request.json();
        if (!examId || !answers) return NextResponse.json({ error: 'Exam ID and answers are required' }, { status: 400 });

        const student = await prisma.student.findUnique({ where: { userId: dbUser.id } });
        if (!student) return NextResponse.json({ error: 'Student profile not found' }, { status: 404 });

        const exam = await prisma.exam.findUnique({ where: { id: examId } });
        if (!exam) return NextResponse.json({ error: 'Exam not found' }, { status: 404 });

        let attempt = await prisma.examAttempt.findFirst({
            where: { examId, studentId: student.id }
        });

        if (!attempt) {
            return NextResponse.json({ error: 'Exam not started yet' }, { status: 400 });
        }

        if (attempt.status === 'SUBMITTED') {
            return NextResponse.json({ error: 'Exam already submitted' }, { status: 400 });
        }

        // Auto-grade multiple choice & true/false
        const questions: any[] = (exam.questions as any) || [];
        let totalScore = 0;
        let maxScore = 0;

        questions.forEach(q => {
            const points = parseFloat(q.points) || 1;
            maxScore += points;

            if (q.type === 'MULTIPLE_CHOICE' || q.type === 'TRUE_FALSE') {
                if (answers[q.id] && answers[q.id].toString().toLowerCase() === q.correctAnswer?.toString().toLowerCase()) {
                    totalScore += points;
                }
            } else if (q.type === 'SHORT_ANSWER') {
                // Fuzzy matching or keyword matching for short answers could be implemented here.
                // For now, if the answer contains the keyword, give points, otherwise 0 (needs manual review).
                const studentAnswer = answers[q.id]?.toString().toLowerCase() || '';
                const correctAnswer = q.correctAnswer?.toString().toLowerCase() || '';
                if (studentAnswer && correctAnswer && studentAnswer.includes(correctAnswer)) {
                    totalScore += points;
                }
            }
        });

        // Normalize score to exam.totalMarks
        const normalizedScore = maxScore > 0 ? (totalScore / maxScore) * (exam.totalMarks || 100) : 0;

        // Update Attempt
        attempt = await prisma.examAttempt.update({
            where: { id: attempt.id },
            data: {
                submittedAt: new Date(),
                status: 'SUBMITTED',
                score: normalizedScore,
                answers: answers
            }
        });

        // Upsert GradeRecord
        await prisma.gradeRecord.upsert({
            where: { studentId_examId: { studentId: student.id, examId } },
            create: {
                studentId: student.id,
                examId,
                subjectId: exam.subjectId,
                score: normalizedScore,
                createdById: dbUser.id,
                status: 'SUBMITTED'
            },
            update: {
                score: normalizedScore,
                updatedAt: new Date()
            }
        });

        return NextResponse.json({ attempt, score: normalizedScore });
    } catch (e) {
        return handleApiError(e);
    }
}
