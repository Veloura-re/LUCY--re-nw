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
        const dbUser = await requireRole(['OWNER', 'PRINCIPAL', 'SUPERADMIN']);

        const body = await request.json() as { classId: string, homeroomTeacherId: string | null };
        const { classId, homeroomTeacherId } = body;

        // Ensure the class belongs to this school
        const targetClass = await prisma.class.findUnique({
            where: { id: classId },
            include: { grade: true }
        });

        if (!targetClass || targetClass.grade.schoolId !== dbUser.schoolId) {
            return NextResponse.json({ error: 'Class not found' }, { status: 404 });
        }

        if (homeroomTeacherId) {
            const targetTeacher = await prisma.user.findFirst({
                where: { id: homeroomTeacherId, schoolId: dbUser.schoolId }
            });
            if (!targetTeacher) {
                return NextResponse.json({ error: 'Selected teacher does not belong to your institution' }, { status: 400 });
            }
            if (targetTeacher.role === 'TEACHER') {
                await prisma.user.update({
                    where: { id: homeroomTeacherId },
                    data: { role: 'HOMEROOM' }
                });
            }
        }

        const updatedClass = await prisma.class.update({
            where: { id: classId },
            data: { 
                homeroomTeacherId,
                schoolId: targetClass.grade.schoolId
            }
        });

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

        // Invalidate Structure & Personnel Caches
        revalidateTag(getSchoolTag(CACHE_TAGS.CLASSES, dbUser.schoolId!), 'max');
        revalidateTag(getSchoolTag(CACHE_TAGS.USER_PROFILE, dbUser.schoolId!), 'max');

        // Audit log
        try {
            const { logActivity } = await import('@/lib/audit');
            const _ip = request?.headers?.get('x-forwarded-for')?.split(',')[0]?.trim() || request?.headers?.get('cf-connecting-ip') || undefined;
            const _userId = dbUser?.id || undefined;
            if (_userId) {
                await logActivity({ userId: _userId, schoolId: dbUser.schoolId!, action: 'UPDATE', resourceType: 'class', ip: _ip || undefined });
            }
        } catch { /* non-blocking */ }

        return NextResponse.json({ success: true, class: updatedClass });
    } catch (e) {
        return handleApiError(e);
    }
}

export async function POST(request: Request) {
    try {
        const dbUser = await requireRole(['OWNER', 'PRINCIPAL', 'SUPERADMIN']);

        const body = await request.json() as { type: string, name: string, level: string, gradeId: string, schoolId?: string };
        const { type, name, level, gradeId } = body;

        if (type === 'GRADE') {
            // When SUPERADMIN deploys a grade, they should supply a schoolId in the body, otherwise fallback to their dbUser.schoolId
            const targetSchoolId = dbUser.role === 'SUPERADMIN' && body.schoolId ? body.schoolId : dbUser.schoolId!;
            
            const grade = await prisma.grade.create({
                data: {
                    schoolId: targetSchoolId,
                    name,
                    level: parseInt(level),
                }
            });
            revalidateTag(getSchoolTag(CACHE_TAGS.GRADES, targetSchoolId), 'max');
            
            // Audit log
            try {
                const { logActivity } = await import('@/lib/audit');
                const _ip = request?.headers?.get('x-forwarded-for')?.split(',')[0]?.trim() || request?.headers?.get('cf-connecting-ip') || undefined;
                const _userId = dbUser?.id || undefined;
                if (_userId) {
                    await logActivity({ userId: _userId, schoolId: targetSchoolId, action: 'CREATE', resourceType: 'class', ip: _ip || undefined });
                }
            } catch { /* non-blocking */ }

            return NextResponse.json({ grade });
        } else if (type === 'CLASS') {
            const parentGrade = await prisma.grade.findUnique({ where: { id: gradeId } });
            if (!parentGrade || (parentGrade.schoolId !== dbUser.schoolId && dbUser.role !== 'SUPERADMIN')) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }

            const cls = await prisma.class.create({
                data: {
                    gradeId,
                    name,
                    schoolId: parentGrade.schoolId,
                }
            });
            revalidateTag(getSchoolTag(CACHE_TAGS.CLASSES, dbUser.schoolId!), 'max');

            // Audit log
            try {
                const { logActivity } = await import('@/lib/audit');
                const _ip = request?.headers?.get('x-forwarded-for')?.split(',')[0]?.trim() || request?.headers?.get('cf-connecting-ip') || undefined;
                const _userId = dbUser?.id || undefined;
                if (_userId) {
                    await logActivity({ userId: _userId, schoolId: parentGrade.schoolId, action: 'CREATE', resourceType: 'class', ip: _ip || undefined });
                }
            } catch { /* non-blocking */ }

            return NextResponse.json({ cls });
        }
        return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    } catch (e) {
        return handleApiError(e);
    }
}

export async function DELETE(request: Request) {
    try {
        const dbUser = await requireRole(['OWNER', 'PRINCIPAL', 'SUPERADMIN']);

        const body = await request.json() as { id: string, type: string };
        const { id, type } = body;

        if (type === 'CLASS') {
            const targetClass = await prisma.class.findUnique({ where: { id }, include: { grade: true } });
            if (!targetClass || (targetClass.grade.schoolId !== dbUser.schoolId && dbUser.role !== 'SUPERADMIN')) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }

            await prisma.$transaction(async (tx) => {
                // Break prerequisites & clean leaf dependencies
                await tx.exam.updateMany({ where: { classId: id }, data: { prerequisiteId: null } });
                await tx.examAttempt.deleteMany({ where: { exam: { classId: id } } });
                await tx.gradeRecord.deleteMany({ where: { exam: { classId: id } } });
                await tx.exam.deleteMany({ where: { classId: id } });
                await tx.teacherAssignment.deleteMany({ where: { classId: id } });
                await tx.timetable.deleteMany({ where: { classId: id } });
                await tx.lesson.deleteMany({ where: { classId: id } });
                await tx.assignmentSubmission.deleteMany({ where: { assignment: { classId: id } } });
                await tx.assignment.deleteMany({ where: { classId: id } });
                await tx.attendanceRecord.deleteMany({ where: { classId: id } });
                await tx.resourceProgress.deleteMany({ where: { book: { classId: id } } });
                await tx.unitPackResource.deleteMany({ where: { book: { classId: id } } });
                await tx.book.deleteMany({ where: { classId: id } });
                await tx.marklistMark.deleteMany({ where: { entry: { config: { classId: id } } } });
                await tx.marklistEntry.deleteMany({ where: { config: { classId: id } } });
                await tx.marklistColumn.deleteMany({ where: { config: { classId: id } } });
                await tx.marklistConfig.deleteMany({ where: { classId: id } });
                await tx.student.updateMany({ where: { classId: id }, data: { classId: null } });
                await tx.class.delete({ where: { id } });
            });
            revalidateTag(getSchoolTag(CACHE_TAGS.CLASSES, dbUser.schoolId!), 'max');
        } else if (type === 'GRADE') {
            const targetGrade = await prisma.grade.findUnique({ where: { id } });
            if (!targetGrade || (targetGrade.schoolId !== dbUser.schoolId && dbUser.role !== 'SUPERADMIN')) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }

            await prisma.$transaction(async (tx) => {
                // Find all classes in this grade
                const classesInGrade = await tx.class.findMany({ where: { gradeId: id }, select: { id: true } });
                const classIds = classesInGrade.map(c => c.id);

                if (classIds.length > 0) {
                    await tx.exam.updateMany({ where: { classId: { in: classIds } }, data: { prerequisiteId: null } });
                    await tx.examAttempt.deleteMany({ where: { exam: { classId: { in: classIds } } } });
                    await tx.gradeRecord.deleteMany({ where: { exam: { classId: { in: classIds } } } });
                    await tx.exam.deleteMany({ where: { classId: { in: classIds } } });
                    await tx.teacherAssignment.deleteMany({ where: { classId: { in: classIds } } });
                    await tx.timetable.deleteMany({ where: { classId: { in: classIds } } });
                    await tx.lesson.deleteMany({ where: { classId: { in: classIds } } });
                    await tx.assignmentSubmission.deleteMany({ where: { assignment: { classId: { in: classIds } } } });
                    await tx.assignment.deleteMany({ where: { classId: { in: classIds } } });
                    await tx.attendanceRecord.deleteMany({ where: { classId: { in: classIds } } });
                    await tx.resourceProgress.deleteMany({ where: { book: { classId: { in: classIds } } } });
                    await tx.unitPackResource.deleteMany({ where: { book: { classId: { in: classIds } } } });
                    await tx.book.deleteMany({ where: { classId: { in: classIds } } });
                }

                await tx.invoiceItem.updateMany({ where: { feeStructure: { gradeId: id } }, data: { feeStructureId: null } });
                await tx.feeStructure.deleteMany({ where: { gradeId: id } });
                await tx.parentStudentLink.deleteMany({ where: { student: { gradeId: id } } });
                await tx.attendanceRecord.deleteMany({ where: { student: { gradeId: id } } });
                await tx.gradeRecord.deleteMany({ where: { student: { gradeId: id } } });
                await tx.examAttempt.deleteMany({ where: { student: { gradeId: id } } });
                await tx.studentRemark.deleteMany({ where: { student: { gradeId: id } } });
                await tx.internalNote.deleteMany({ where: { student: { gradeId: id } } });
                await tx.absenceAuthorization.deleteMany({ where: { student: { gradeId: id } } });
                await tx.certificate.deleteMany({ where: { student: { gradeId: id } } });
                await tx.student.deleteMany({ where: { gradeId: id } });
                await tx.class.deleteMany({ where: { gradeId: id } });
                await tx.grade.delete({ where: { id } });
            });
            revalidateTag(getSchoolTag(CACHE_TAGS.GRADES, dbUser.schoolId!), 'max');
            revalidateTag(getSchoolTag(CACHE_TAGS.CLASSES, dbUser.schoolId!), 'max');
        } else {
            return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
        }
        
        // Audit log
        try {
            const { logActivity } = await import('@/lib/audit');
            const _ip = request?.headers?.get('x-forwarded-for')?.split(',')[0]?.trim() || request?.headers?.get('cf-connecting-ip') || undefined;
            const _userId = dbUser?.id || undefined;
            if (_userId) {
                await logActivity({ userId: _userId, schoolId: dbUser.schoolId!, action: 'DELETE', resourceType: 'class', ip: _ip || undefined });
            }
        } catch { /* non-blocking */ }
return NextResponse.json({ success: true });
    } catch (e) {
        return handleApiError(e);
    }
}
