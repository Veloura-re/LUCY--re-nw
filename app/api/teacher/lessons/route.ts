import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, handleApiError } from "@/lib/security";

export async function GET(req: Request) {
    try {
        const dbUser = await requireRole(['TEACHER', 'HOMEROOM', 'PRINCIPAL']);

        const { searchParams } = new URL(req.url);
        const classId = searchParams.get('classId');
        const subjectId = searchParams.get('subjectId');

        const lessons = await prisma.lesson.findMany({
            where: {
                teacherId: dbUser.id,
                ...(classId ? { classId } : {}),
                ...(subjectId ? { subjectId } : {}),
            },
            include: {
                class: { select: { name: true } },
                subject: { select: { name: true } },
                period: { select: { name: true, startTime: true, endTime: true } },
            },
            orderBy: { date: 'desc' },
            take: 60,
        });

        return NextResponse.json({ lessons });
    } catch (e) {
        return handleApiError(e);
    }
}

export async function POST(req: Request) {
    try {
        const dbUser = await requireRole(['TEACHER', 'HOMEROOM', 'PRINCIPAL']);
        const body = await req.json() as any;
        const { classId, subjectId, periodId, date, topic, objectives, materials } = body;

        const existingLesson = await prisma.lesson.findFirst({
            where: {
                classId,
                subjectId,
                periodId: periodId || null,
                date: new Date(date),
                teacherId: dbUser.id
            }
        });

        let lesson;

        if (existingLesson) {
            lesson = await prisma.lesson.update({
                where: { id: existingLesson.id },
                data: { topic, objectives, materials: materials || null }
            });
        } else {
            lesson = await prisma.lesson.create({
                data: {
                    classId,
                    subjectId,
                    periodId: periodId || null,
                    teacherId: dbUser.id,
                    date: new Date(date),
                    topic,
                    objectives,
                    materials: materials || null
                }
            });
        }

        
        // Audit log
        try {
            const { logActivity } = await import('@/lib/audit');
            const _ip = request instanceof Request ? (request.headers.get('x-forwarded-for') || request.headers.get('cf-connecting-ip') || undefined) : undefined;
            const _userId = (typeof user !== 'undefined' && user?.id) ? user.id : undefined;
            if (_userId) {
                await logActivity({ userId: _userId, action: 'CREATE', resourceType: 'lesson', ip: _ip || undefined });
            }
        } catch { /* non-blocking */ }
return NextResponse.json({ lesson });
    } catch (e) {
        return handleApiError(e);
    }
}
