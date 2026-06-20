import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole, handleApiError } from '@/lib/security';
import { sendAssessmentAssignedEmail } from '@/lib/email';

export async function POST(request: Request) {
    try {
        const dbUser = await requireRole(['TEACHER', 'HOMEROOM', 'PRINCIPAL']);
        const { classId, subjectId, title, date, maxScore, questions, duration, isLocked, config } = (await request.json()) as any;

        const computedMaxScore = questions && Array.isArray(questions)
            ? questions.reduce((acc: number, q: any) => acc + (parseFloat(q.points) || 0), 0)
            : (parseInt(maxScore) || 100);

        const exam = await prisma.exam.create({
            data: {
                title,
                classId,
                subjectId,
                createdById: dbUser.id,
                questions: questions ?? [],
                dueAt: date ? new Date(date) : undefined,
                duration: parseInt(duration) || undefined,
                isLocked: isLocked !== undefined ? isLocked : true,
                totalMarks: computedMaxScore,
                config: config ?? { maxScore: computedMaxScore }
            },
            include: { subject: true, class: { include: { grade: true } } }
        });

        // Trigger notifications for new assignment
        if (exam) {
            const schoolId = (exam as any).class.grade.schoolId;
            const students = await prisma.student.findMany({
                where: { classId: exam.classId },
                include: { parentLinks: { include: { parent: true } } }
            });

            const dueDateFormatted = exam.dueAt ? new Date(exam.dueAt).toLocaleDateString() : 'N/A';

            for (const student of students) {
                const studentName = `${student.firstName} ${student.lastName}`;
                for (const link of student.parentLinks) {
                    if (link.parent.email) {
                        sendAssessmentAssignedEmail(
                            link.parent.email,
                            studentName,
                            exam.title,
                            (exam as any).subject.name,
                            dueDateFormatted,
                            schoolId
                        ).catch(err => console.error(`Failed to notify parent of student ${student.id}:`, err));
                    }
                }
            }
        }

        return NextResponse.json({ exam });
    } catch (e) {
        return handleApiError(e);
    }
}

export async function GET(request: Request) {
    try {
        const dbUser = await requireRole(['TEACHER', 'HOMEROOM', 'PRINCIPAL']);

        const { searchParams } = new URL(request.url);
        const classId = searchParams.get('classId');
        const recent = searchParams.get('recent') === 'true';

        if (!classId && !recent) {
            return NextResponse.json({ error: 'Class ID required' }, { status: 400 });
        }

        const exams = await prisma.exam.findMany({
            where: classId ? { classId } : { createdById: dbUser.id },
            include: {
                gradeRecords: true,
                subject: true
            },
            orderBy: { dueAt: 'desc' },
            take: recent ? 5 : undefined
        });
        return NextResponse.json({ exams });
    } catch (e) {
        return handleApiError(e);
    }
}
