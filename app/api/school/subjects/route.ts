import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSchoolLinked, requireRole, handleApiError } from '@/lib/security';
import { revalidateTag } from 'next/cache';
import { CACHE_TAGS, getSchoolTag } from '@/lib/cache-keys';

import { logActivity } from '@/lib/audit';
export async function GET(request: Request) {
    try {
        const dbUser = await requireSchoolLinked();

        const subjects = await prisma.subject.findMany({
            where: { schoolId: dbUser.schoolId! },
            orderBy: { name: 'asc' }
        });
        return NextResponse.json({ subjects });
    } catch (e) {
        return handleApiError(e);
    }
}

export async function POST(request: Request) {
    try {
        const dbUser = await requireRole(['OWNER', 'PRINCIPAL', 'SUPERADMIN']);

        const body = (await request.json().catch(() => ({}))) as { name: string };
        const { name } = body;

        const subject = await prisma.subject.create({
            data: {
                schoolId: dbUser.schoolId!,
                name
            }
        });

        // Trigger Cache Invalidation
        try {
            revalidateTag(getSchoolTag(CACHE_TAGS.CLASSES, dbUser.schoolId!), 'max');
        } catch { /* non-blocking */ }

        // Audit log
        try {
            const _ip = request?.headers?.get('x-forwarded-for')?.split(',')[0]?.trim() || request?.headers?.get('cf-connecting-ip') || undefined;
            await logActivity({ userId: dbUser.id, schoolId: dbUser.schoolId, action: 'CREATE_SUBJECT', resourceType: 'subject', ip: _ip || undefined });
        } catch { /* non-blocking */ }

        return NextResponse.json({ subject });
    } catch (e) {
        return handleApiError(e);
    }
}

export async function DELETE(request: Request) {
    try {
        const dbUser = await requireRole(['OWNER', 'PRINCIPAL', 'SUPERADMIN']);

        const body = (await request.json().catch(() => ({}))) as { id: string };
        const { id } = body;

        // Tenant Isolation: Ensure the subject being deleted actually belongs to this school
        const subjectToDelete = await prisma.subject.findUnique({ where: { id } });
        if (subjectToDelete?.schoolId !== dbUser.schoolId && dbUser.role !== 'SUPERADMIN') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Clean up dependent mappings in leaf-to-root order to prevent FK violations atomically
        await prisma.$transaction(async (tx) => {
            await tx.teacherAssignment.deleteMany({ where: { subjectId: id } });
            await tx.timetable.deleteMany({ where: { subjectId: id } });
            await tx.lesson.deleteMany({ where: { subjectId: id } });
            await tx.attendanceRecord.deleteMany({ where: { subjectId: id } });
            await tx.gradeRecord.deleteMany({ where: { subjectId: id } });
            await tx.assignmentSubmission.deleteMany({ where: { assignment: { subjectId: id } } });
            await tx.assignment.deleteMany({ where: { subjectId: id } });
            await tx.examAttempt.deleteMany({ where: { exam: { subjectId: id } } });
            await tx.exam.deleteMany({ where: { subjectId: id } });
            await tx.resourceProgress.deleteMany({ where: { book: { subjectId: id } } });
            await tx.unitPackResource.deleteMany({ where: { book: { subjectId: id } } });
            await tx.book.deleteMany({ where: { subjectId: id } });
            await tx.marklistMark.deleteMany({ where: { entry: { config: { subjectId: id } } } });
            await tx.marklistEntry.deleteMany({ where: { config: { subjectId: id } } });
            await tx.marklistColumn.deleteMany({ where: { config: { subjectId: id } } });
            await tx.marklistConfig.deleteMany({ where: { subjectId: id } });

            await tx.subject.delete({ where: { id } });
        });

        // Trigger Cache Invalidation
        try {
            revalidateTag(getSchoolTag(CACHE_TAGS.CLASSES, dbUser.schoolId!), 'max');
        } catch { /* non-blocking */ }

        // Audit log
        try {
            const _ip = request?.headers?.get('x-forwarded-for')?.split(',')[0]?.trim() || request?.headers?.get('cf-connecting-ip') || undefined;
            const targetSchoolId = subjectToDelete?.schoolId || dbUser.schoolId!;
            await logActivity({
                userId: dbUser.id,
                schoolId: targetSchoolId,
                action: 'DELETE_SUBJECT',
                resourceType: 'subject',
                resourceId: id,
                ip: _ip || undefined
            });
        } catch { /* non-blocking */ }

        return NextResponse.json({ success: true });
    } catch (e) {
        return handleApiError(e);
    }
}
