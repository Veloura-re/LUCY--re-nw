import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleApiError, requireRole } from '@/lib/security';

export async function GET(request: Request) {
    try {
        const user = await requireRole(['SUPERADMIN', 'PRINCIPAL', 'TEACHER', 'HOMEROOM', 'STUDENT', 'PARENT']);
        const { searchParams } = new URL(request.url);
        const classId = searchParams.get('classId');
        const teacherId = searchParams.get('teacherId');

        if (!classId && !teacherId) {
            return NextResponse.json({ error: "classId or teacherId required" }, { status: 400 });
        }

        const where: any = {};
        if (classId) where.classId = classId;
        if (teacherId) where.teacherId = teacherId;

        const timetable = await prisma.timetable.findMany({
            where,
            include: {
                class: true,
                subject: true,
                teacher: true,
                period: true
            },
            orderBy: [
                { dayOfWeek: 'asc' },
                { period: { order: 'asc' } }
            ]
        });

        return NextResponse.json({ timetable });
    } catch (e) {
        return handleApiError(e);
    }
}

export async function POST(request: Request) {
    try {
        const user = await requireRole(['SUPERADMIN', 'PRINCIPAL']);
        const { classId, subjectId, teacherId, periodId, dayOfWeek }: any = await request.json().catch(() => ({}));

        if (!classId || !subjectId || !teacherId || !periodId || !dayOfWeek) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // [CONFLICT CHECK] Time-Range Overlap Detection
        // 1. Get details of the period we're trying to assign
        const targetPeriod = await prisma.period.findUnique({
            where: { id: periodId }
        });

        if (!targetPeriod || (targetPeriod.schoolId !== user.schoolId && user.role !== 'SUPERADMIN')) {
            return NextResponse.json({ error: "Period not found" }, { status: 404 });
        }

        // 2. Fetch all assignments for this teacher on this day to check for time overlaps
        const teacherAssignments = await prisma.timetable.findMany({
            where: {
                teacherId,
                dayOfWeek
            },
            include: {
                period: true,
                class: true
            }
        });

        // 3. Helper to check overlap: (StartA < EndB) && (EndA > StartB)
        const isOverlap = (s1: string, e1: string, s2: string, e2: string) => {
            return s1 < e2 && e1 > s2;
        };

        for (const entry of teacherAssignments) {
            // Skip if it's the exact same slot we're about to upsert (classId + periodId + day)
            if (entry.classId === classId && entry.periodId === periodId && entry.dayOfWeek === dayOfWeek) continue;

            if (isOverlap(targetPeriod.startTime, targetPeriod.endTime, entry.period.startTime, entry.period.endTime)) {
                return NextResponse.json({
                    error: `Conflict: Teacher is busy in ${entry.class.name} (${entry.period.startTime}-${entry.period.endTime}).`
                }, { status: 409 });
            }
        }

        // Upsert the timetable slot
        const result = await prisma.timetable.upsert({
            where: {
                classId_periodId_dayOfWeek: {
                    classId,
                    periodId,
                    dayOfWeek
                }
            },
            update: {
                subjectId,
                teacherId
            },
            create: {
                classId,
                subjectId,
                teacherId,
                periodId,
                dayOfWeek
            }
        });

        // Audit log
        try {
            const { logActivity } = await import('@/lib/audit');
            const _ip = request?.headers?.get('x-forwarded-for')?.split(',')[0]?.trim() || request?.headers?.get('cf-connecting-ip') || undefined;
            await logActivity({
                userId: user.id,
                schoolId: user.schoolId!,
                action: 'CREATE_TIMETABLE_SLOT',
                resourceType: 'TIMETABLE',
                resourceId: result.id,
                ip: _ip || undefined
            });
        } catch { /* non-blocking */ }

        return NextResponse.json({ success: true, entry: result });
    } catch (e) {
        return handleApiError(e);
    }
}

export async function DELETE(request: Request) {
    try {
        const user = await requireRole(['SUPERADMIN', 'PRINCIPAL']);
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

        const slot = await prisma.timetable.findFirst({
            where: { id },
            include: { period: true }
        });

        if (!slot || (slot.period.schoolId !== user.schoolId && user.role !== 'SUPERADMIN')) {
            return NextResponse.json({ error: "Slot not found" }, { status: 404 });
        }

        await prisma.timetable.delete({ where: { id } });
        
        // Audit log
        try {
            const { logActivity } = await import('@/lib/audit');
            const _ip = request?.headers?.get('x-forwarded-for')?.split(',')[0]?.trim() || request?.headers?.get('cf-connecting-ip') || undefined;
            await logActivity({
                userId: user.id,
                schoolId: user.schoolId!,
                action: 'DELETE_TIMETABLE_SLOT',
                resourceType: 'TIMETABLE',
                resourceId: id,
                ip: _ip || undefined
            });
        } catch { /* non-blocking */ }

        return NextResponse.json({ success: true });
    } catch (e) {
        return handleApiError(e);
    }
}
