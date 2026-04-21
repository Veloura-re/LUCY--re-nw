import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSchoolLinked, requireRole, handleApiError } from '@/lib/security';
import { revalidateTag } from 'next/cache';
import { CACHE_TAGS, getSchoolTag } from '@/lib/cache-keys';

export async function GET(request: Request) {
    try {
        const dbUser = await requireSchoolLinked();

        const { searchParams } = new URL(request.url);
        const gradeId = searchParams.get('gradeId');

        // If gradeId is given, return flat classes for that grade (for dropdowns)
        if (gradeId) {
            const classes = await prisma.class.findMany({
                where: { gradeId, grade: { schoolId: dbUser.schoolId } },
                select: { id: true, name: true },
                orderBy: { name: 'asc' }
            });
            return NextResponse.json({ classes });
        }

        // Full nested response
        const grades = await prisma.grade.findMany({
            where: { schoolId: dbUser.schoolId },
            include: {
                classes: {
                    include: {
                        homeroomTeacher: { select: { id: true, name: true, email: true } },
                        _count: { select: { students: true } }
                    },
                    orderBy: { name: 'asc' }
                }
            },
            orderBy: { level: 'asc' }
        });

        return NextResponse.json({ grades });
    } catch (e) {
        return handleApiError(e);
    }
}


export async function PATCH(request: Request) {
    try {
        const dbUser = await requireRole(['PRINCIPAL', 'SUPERADMIN']);

        const { classId, homeroomTeacherId } = await request.json();

        // Ensure the class belongs to this school
        const targetClass = await prisma.class.findUnique({
            where: { id: classId },
            include: { grade: true }
        });

        if (!targetClass || targetClass.grade.schoolId !== dbUser.schoolId) {
            return NextResponse.json({ error: 'Class not found' }, { status: 404 });
        }

        const updatedClass = await prisma.class.update({
            where: { id: classId },
            data: { homeroomTeacherId }
        });

        // Role Transition Logic:
        if (homeroomTeacherId) {
            await prisma.user.update({
                where: { id: homeroomTeacherId },
                data: { role: 'HOMEROOM' }
            });
        }

        // Cleanup: Any user with HOMEROOM role in this school who is NOT a homeroom teacher anymore
        const activeHomeroomTeachers = await prisma.class.findMany({
            where: {
                NOT: { homeroomTeacherId: null },
                grade: { schoolId: dbUser.schoolId }
            },
            select: { homeroomTeacherId: true }
        });
        const activeIds = new Set(activeHomeroomTeachers.map(c => (c.homeroomTeacherId as string)));

        const teachersToRevert = await prisma.user.findMany({
            where: {
                role: 'HOMEROOM',
                schoolId: dbUser.schoolId,
                id: { notIn: Array.from(activeIds) }
            }
        });

        for (const teacher of teachersToRevert) {
            await prisma.user.update({
                where: { id: teacher.id },
                data: { role: 'TEACHER' }
            });
        }

        // Invalidate Structure Caches
        revalidateTag(getSchoolTag(CACHE_TAGS.CLASSES, dbUser.schoolId!), 'max');

        return NextResponse.json({ success: true, class: updatedClass });
    } catch (e) {
        return handleApiError(e);
    }
}

export async function POST(request: Request) {
    try {
        const dbUser = await requireRole(['PRINCIPAL', 'SUPERADMIN']);

        const body = await request.json();
        const { type, name, level, gradeId } = body;

        if (type === 'GRADE') {
            const grade = await prisma.grade.create({
                data: {
                    schoolId: dbUser.schoolId!,
                    name,
                    level: parseInt(level),
                }
            });
            revalidateTag(getSchoolTag(CACHE_TAGS.GRADES, dbUser.schoolId!), 'max');
            return NextResponse.json({ grade });
        } else if (type === 'CLASS') {
            const parentGrade = await prisma.grade.findUnique({ where: { id: gradeId } });
            if (!parentGrade || parentGrade.schoolId !== dbUser.schoolId) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }

            const cls = await prisma.class.create({
                data: {
                    gradeId,
                    name,
                }
            });
            revalidateTag(getSchoolTag(CACHE_TAGS.CLASSES, dbUser.schoolId!), 'max');
            return NextResponse.json({ cls });
        }
        return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    } catch (e) {
        return handleApiError(e);
    }
}

export async function DELETE(request: Request) {
    try {
        const dbUser = await requireRole(['PRINCIPAL', 'SUPERADMIN']);

        const { id, type } = await request.json();

        if (type === 'CLASS') {
            const targetClass = await prisma.class.findUnique({ where: { id }, include: { grade: true } });
            if (!targetClass || targetClass.grade.schoolId !== dbUser.schoolId) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }

            await prisma.$transaction(async (tx) => {
                await tx.teacherAssignment.deleteMany({ where: { classId: id } });
                await tx.timetable.deleteMany({ where: { classId: id } });
                await tx.exam.deleteMany({ where: { classId: id } });
                await tx.lesson.deleteMany({ where: { classId: id } });
                await tx.student.updateMany({ where: { classId: id }, data: { classId: null } });
                await tx.class.delete({ where: { id } });
            });
            revalidateTag(getSchoolTag(CACHE_TAGS.CLASSES, dbUser.schoolId!), 'max');
        } else if (type === 'GRADE') {
            const targetGrade = await prisma.grade.findUnique({ where: { id } });
            if (!targetGrade || targetGrade.schoolId !== dbUser.schoolId) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }

            await prisma.$transaction(async (tx) => {
                // Cascading deletes usually handled by DB, but here we do it explicitly for complex links
                await tx.parentStudentLink.deleteMany({ where: { student: { gradeId: id } } });
                await tx.attendanceRecord.deleteMany({ where: { student: { gradeId: id } } });
                await tx.gradeRecord.deleteMany({ where: { student: { gradeId: id } } });
                await tx.examAttempt.deleteMany({ where: { student: { gradeId: id } } });
                await tx.student.deleteMany({ where: { gradeId: id } });
                await tx.class.deleteMany({ where: { gradeId: id } });
                await tx.grade.delete({ where: { id } });
            });
            revalidateTag(getSchoolTag(CACHE_TAGS.GRADES, dbUser.schoolId!), 'max');
            revalidateTag(getSchoolTag(CACHE_TAGS.CLASSES, dbUser.schoolId!), 'max');
        } else {
            return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
        }
        return NextResponse.json({ success: true });
    } catch (e) {
        return handleApiError(e);
    }
}
