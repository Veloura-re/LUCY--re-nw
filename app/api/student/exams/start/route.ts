import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSchoolLinked, handleApiError } from '@/lib/security';

export async function POST(request: Request) {
    try {
        const dbUser = await requireSchoolLinked();
        if (dbUser.role !== 'STUDENT') {
            return NextResponse.json({ error: 'Only students can start exams' }, { status: 403 });
        }

        const { examId } = await request.json();
        if (!examId) return NextResponse.json({ error: 'Exam ID is required' }, { status: 400 });

        const student = await prisma.student.findUnique({ where: { userId: dbUser.id } });
        if (!student) return NextResponse.json({ error: 'Student profile not found' }, { status: 404 });

        // Check if exam exists and is published
        const exam = await prisma.exam.findUnique({ where: { id: examId } });
        if (!exam || !exam.isPublished) {
            return NextResponse.json({ error: 'Exam not available' }, { status: 404 });
        }

        // Check for existing attempt
        let attempt = await prisma.examAttempt.findFirst({
            where: { examId, studentId: student.id }
        });

        if (!attempt) {
            // Start a new attempt
            attempt = await prisma.examAttempt.create({
                data: {
                    examId,
                    studentId: student.id,
                    startedAt: new Date(),
                    status: 'IN_PROGRESS'
                }
            });
        }

        return NextResponse.json({ attempt });
    } catch (e) {
        return handleApiError(e);
    }
}
