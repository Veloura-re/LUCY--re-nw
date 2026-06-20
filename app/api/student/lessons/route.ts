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

        const lessons = await prisma.lesson.findMany({
            where: {
                classId: student.classId
            },
            include: {
                class: { select: { name: true } },
                subject: { select: { name: true } },
                period: { select: { name: true, startTime: true, endTime: true } },
                teacher: { select: { name: true } },
            },
            orderBy: { date: 'desc' },
            take: 100,
        });

        return NextResponse.json({ lessons });
    } catch (e) {
        return handleApiError(e);
    }
}
