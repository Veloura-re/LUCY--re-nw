import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, handleApiError } from "@/lib/security";

export async function GET(req: Request) {
    try {
        const dbUser = await requireRole(['STUDENT']);

        const student = await prisma.student.findFirst({
            where: { userId: dbUser.id }
        });

        if (!student || !student.classId) {
            return NextResponse.json({ error: "Student profile not active" }, { status: 404 });
        }

        const examsData = await prisma.exam.findMany({
            where: { classId: student.classId },
            include: {
                subject: true,
                gradeRecords: {
                    where: { studentId: student.id }
                },
                attempts: {
                    where: { studentId: student.id }
                }
            },
            orderBy: { dueAt: 'desc' }
        });

        const formattedExams = examsData.map(exam => {
            const now = new Date();
            const dueAt = exam.dueAt ? new Date(exam.dueAt) : null;
            const availableFrom = exam.availableFrom ? new Date(exam.availableFrom) : null;
            const hasSubmitted = (exam as any).attempts.some((a: any) => a.status === 'SUBMITTED') || exam.gradeRecords.length > 0;

            let status = "UPCOMING";
            if (exam.isPublished || hasSubmitted) {
                status = "COMPLETED";
            } else if (dueAt && now > dueAt) {
                status = "MISSED";
            } else if (!availableFrom || now >= availableFrom) {
                status = "ACTIVE";
            }

            const rawScore = (exam.isPublished || hasSubmitted)
                ? (exam.gradeRecords[0]?.score ?? (exam.attempts[0]?.score ? Number(exam.attempts[0].score) : undefined))
                : undefined;
            const maxMarks = exam.totalMarks || (exam.config as any)?.maxScore || 100;
            const pctScore = rawScore !== undefined ? Math.round((rawScore / maxMarks) * 100) : undefined;

            return {
                id: exam.id,
                title: exam.title,
                subject: exam.subject.name,
                date: exam.dueAt,
                duration: exam.duration || 60,
                status,
                score: pctScore,
                isPublished: exam.isPublished
            };
        });

        return NextResponse.json({ exams: formattedExams });

    } catch (e) {
        return handleApiError(e);
    }
}
