import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, handleApiError } from "@/lib/security";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    try {
        const dbUser = await requireRole(['STUDENT']);

        const student = await prisma.student.findFirst({
            where: { userId: dbUser.id }
        });

        if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });

        const exam = await prisma.exam.findUnique({
            where: { id },
            include: { subject: true }
        });

        if (!exam) return NextResponse.json({ error: "Exam not found" }, { status: 404 });

        // Ensure student is in the class
        if (exam.classId !== student.classId) {
            return NextResponse.json({ error: "Access Denied" }, { status: 403 });
        }

        const now = new Date();
        const availableFrom = exam.availableFrom ? new Date(exam.availableFrom) : null;
        const dueAt = exam.dueAt ? new Date(exam.dueAt) : null;

        // Strict Timing Locks
        if (availableFrom && now < availableFrom) {
            return NextResponse.json({ error: "Assessment not yet available" }, { status: 403 });
        }

        if (dueAt && now > dueAt) {
            return NextResponse.json({ error: "Assessment window closed" }, { status: 403 });
        }

        // Check if student already has a submitted attempt
        const existingAttempt = await prisma.examAttempt.findFirst({
            where: { examId: exam.id, studentId: student.id, status: 'SUBMITTED' }
        });

        if (existingAttempt) {
            return NextResponse.json({ error: "Assessment already submitted" }, { status: 400 });
        }

        // Prepare safe question data (hide correct answers if they are in the same JSON)
        const rawQuestions = exam.questions as any[] || [];
        const safeQuestions = rawQuestions.map((q: any) => ({
            id: q.id,
            text: q.text,
            type: q.type,
            options: q.options,
            points: q.points
        }));

        return NextResponse.json({
            exam: {
                id: exam.id,
                title: exam.title,
                duration: exam.duration,
                subject: exam.subject.name,
                questions: safeQuestions
            }
        });

    } catch (e) {
        return handleApiError(e);
    }
}
