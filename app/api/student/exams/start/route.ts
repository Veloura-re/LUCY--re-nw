import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSchoolLinked, handleApiError } from '@/lib/security';

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

        // 🛡️ Warding Spell: scope exam lookup via Class → schoolId to prevent IDOR cross-school access
        // (Exam has no direct schoolId — it's owned by a Class which belongs to a school)
        const exam = await prisma.exam.findFirst({
            where: {
                id: examId,
                isPublished: true,
                class: { schoolId: student.schoolId }  // Tenant isolation via class relationship
            }
        });
        if (!exam) {
            return NextResponse.json({ error: 'Exam not available' }, { status: 404 });
        }

        // 🔮 Dark Magic: prevent duplicate attempt creation under rapid double-submit
        let attempt = await prisma.examAttempt.findFirst({
            where: { examId, studentId: student.id }
        });

        if (!attempt) {
            attempt = await prisma.examAttempt.create({
                data: {
                    examId,
                    studentId: student.id,
                    startedAt: new Date(),
                    status: 'IN_PROGRESS'
                }
            });
        }

        // Non-blocking audit
        try {
            const { logActivity } = await import('@/lib/audit');
            const _ip = request?.headers?.get('x-forwarded-for')?.split(',')[0]?.trim() || request?.headers?.get('cf-connecting-ip') || undefined;
            await logActivity({ userId: dbUser.id, action: 'START_EXAM', resourceType: 'exam', resourceId: examId, ip: _ip });
        } catch { /* non-blocking */ }

        return NextResponse.json({ attempt });
    } catch (e) {
        return handleApiError(e);
    }
}
