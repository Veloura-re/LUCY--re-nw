import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole, requireSchoolLinked, publicErrorMessage } from '@/lib/security';
import { logActivity } from '@/lib/audit';
import { reportServerError } from '@/lib/error-capture';

// GET: List Marklists (Exams)
export async function GET(request: Request) {
    try {
        const user = await requireSchoolLinked();
        const { searchParams } = new URL(request.url);
        const classId = searchParams.get('classId');
        const subjectId = searchParams.get('subjectId');
        const termId = searchParams.get('termId');

        const where: any = {
            class: { grade: { schoolId: user.schoolId } }
        };

        if (classId) where.classId = classId;
        if (subjectId) where.subjectId = subjectId;
        if (termId) where.termId = termId;

        // Teacher and Homeroom role filtering
        if (['TEACHER', 'HOMEROOM'].includes(user.role)) {
            const [assignments, homeroomClasses, timetables] = await Promise.all([
                prisma.teacherAssignment.findMany({
                    where: { teacherId: user.id },
                    select: { classId: true, subjectId: true }
                }),
                prisma.class.findMany({
                    where: { schoolId: user.schoolId, homeroomTeacherId: user.id },
                    select: { id: true }
                }),
                prisma.timetable.findMany({
                    where: { teacherId: user.id },
                    select: { classId: true, subjectId: true }
                })
            ]);

            const homeroomClassIds = homeroomClasses.map(c => c.id);
            const assignmentClassIds = assignments.map(a => a.classId);
            const timetableClassIds = timetables.map(t => t.classId);
            const allClasses = Array.from(new Set([...homeroomClassIds, ...assignmentClassIds, ...timetableClassIds]));

            if (allClasses.length > 0) {
                where.classId = { in: allClasses };
            } else {
                return NextResponse.json({ exams: [] });
            }
        }

        const exams = await prisma.exam.findMany({
            where,
            include: {
                class: { select: { name: true, grade: { select: { name: true, level: true } } } },
                subject: { select: { name: true } },
                term: { select: { id: true, name: true, isActive: true, startDate: true, endDate: true } },
                _count: { select: { gradeRecords: true } }
            },
            orderBy: { availableFrom: 'desc' }
        });

        return NextResponse.json({ exams });

    } catch (e: any) {
        void reportServerError(e, { status: 500 });
        return NextResponse.json({ error: publicErrorMessage(e, "Failed to fetch marklists") }, { status: 500 });
    }
}

// POST: Create a new Marklist
export async function POST(request: Request) {
    try {
        const user = await requireRole(['OWNER', 'PRINCIPAL', 'SUPERADMIN', 'TEACHER', 'HOMEROOM']);

        const { title, classId, subjectId, totalMarks, category, description, date, termId } = await request.json() as any;

        // Validate assignment if Teacher or Homeroom
        if (['TEACHER', 'HOMEROOM'].includes(user.role)) {
            let isAuthorized = false;
            const targetClass = await prisma.class.findUnique({
                where: { id: classId },
                select: { homeroomTeacherId: true }
            });
            if (targetClass?.homeroomTeacherId === user.id) isAuthorized = true;

            if (!isAuthorized) {
                const assignment = await prisma.teacherAssignment.findFirst({
                    where: {
                        teacherId: user.id,
                        classId,
                        ...(subjectId ? { subjectId } : {})
                    }
                });
                if (assignment) isAuthorized = true;
            }

            if (!isAuthorized) {
                const timetable = await prisma.timetable.findFirst({
                    where: {
                        teacherId: user.id,
                        classId,
                        ...(subjectId ? { subjectId } : {})
                    }
                });
                if (timetable) isAuthorized = true;
            }

            if (!isAuthorized) {
                return NextResponse.json({ error: "You are not assigned to this Class and Subject" }, { status: 403 });
            }
        }

        const marklist = await prisma.exam.create({
            data: {
                title,
                classId,
                subjectId,
                termId,
                totalMarks: parseFloat(totalMarks),
                category,
                description,
                createdById: user.id,
                availableFrom: date ? new Date(date) : new Date(),
            }
        });

        // Audit log with valid schoolId
        if (user.schoolId) {
            try {
                const _ip = request?.headers?.get('x-forwarded-for')?.split(',')[0]?.trim() || request?.headers?.get('cf-connecting-ip') || undefined;
                await logActivity({
                    userId: user.id,
                    schoolId: user.schoolId,
                    action: 'CREATE_MARKLIST_EXAM',
                    resourceType: 'EXAM',
                    resourceId: marklist.id,
                    ip: _ip
                });
            } catch (auditErr) {
                console.error("Audit log error:", auditErr);
            }
        }

        return NextResponse.json({ marklist });

    } catch (e: any) {
        void reportServerError(e, { status: 500 });
        return NextResponse.json({ error: publicErrorMessage(e, "Failed to create marklist") }, { status: 500 });
    }
}
