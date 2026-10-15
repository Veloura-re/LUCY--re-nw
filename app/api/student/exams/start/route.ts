import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSchoolLinked, handleApiError } from '@/lib/security';
import { ensureAttemptStarted } from '@/lib/exam-attempts';
import { logActivity } from '@/lib/audit';

export async function POST(request: Request) {
    try {
        const dbUser = await requireSchoolLinked();
        if (dbUser.role !== 'STUDENT') {
            return NextResponse.json({ error: 'Only students can start exams' }, { status: 403 });
        }

        const { examId } = (await request.json()) as { examId: string };
        if (!examId) return NextResponse.json({ error: 'Exam ID is required' }, { status: 400 });

        const student = await prisma.student.findUnique({ where: { userId: dbUser.id } });
        if (!student) return NextResponse.json({ error: 'Student profile not found' }, { status: 404 });

        // Scope the exam lookup to the student's own class and school to prevent cross-tenant access.
        // (Exam has no direct schoolId; it is owned by a Class which belongs to a school.)
        const exam = await prisma.exam.findFirst({
            where: {
                id: examId,
                isPublished: true,
                isLocked: false,
                classId: student.classId ?? '__no_class__',
                class: { schoolId: student.schoolId }
            }
        });
        if (!exam) {
            return NextResponse.json({ error: 'Exam not available' }, { status: 404 });
        }

        // Idempotent: concurrent or repeated starts return the same attempt.
        const attempt = await ensureAttemptStarted(prisma, exam.id, student.id);

        await logActivity({
            userId: dbUser.id,
            schoolId: student.schoolId,
            action: 'START_EXAM',
            resourceType: 'exam',
            resourceId: exam.id,
            ip: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('cf-connecting-ip') || undefined
        });

        return NextResponse.json({ attempt });
    } catch (e) {
        return handleApiError(e);
    }
}
