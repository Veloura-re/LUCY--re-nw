import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole, handleApiError } from '@/lib/security';
import { revalidateTag } from 'next/cache';
import { CACHE_TAGS, getSchoolTag } from '@/lib/cache-keys';

import { logActivity } from '@/lib/audit';
export async function GET(request: Request) {
    try {
        const user = await requireRole(['OWNER', 'TEACHER', 'HOMEROOM', 'PRINCIPAL', 'SUPERADMIN']);
        const { searchParams } = new URL(request.url);
        
        const classId = searchParams.get('classId');
        const assignmentId = searchParams.get('id');

        if (assignmentId) {
            const assignment = await prisma.assignment.findUnique({
                where: { id: assignmentId, schoolId: user.schoolId! },
                include: {
                    class: { select: { name: true } },
                    subject: { select: { name: true } },
                    submissions: {
                        include: {
                            student: { select: { firstName: true, lastName: true, studentCode: true } }
                        }
                    }
                }
            });
            return NextResponse.json({ assignment });
        }

        if (classId) {
            const assignments = await prisma.assignment.findMany({
                where: { classId, schoolId: user.schoolId! },
                include: {
                    subject: { select: { name: true } },
                    _count: { select: { submissions: true } }
                },
                orderBy: { dueDate: 'desc' }
            });
            return NextResponse.json({ assignments });
        }

        return NextResponse.json({ error: "Context required" }, { status: 400 });

    } catch (e) {
        return handleApiError(e);
    }
}

export async function POST(request: Request) {
    try {
        const user = await requireRole(['TEACHER', 'HOMEROOM', 'PRINCIPAL']);
        const body = (await request.json().catch(() => ({}))) as any;
        const { title, description, classId, subjectId, dueDate, type, materials } = body;

        const assignment = await prisma.assignment.create({
            data: {
                schoolId: user.schoolId!,
                teacherId: user.id,
                classId,
                subjectId,
                title,
                description,
                dueDate: new Date(dueDate),
                type: type || 'HOMEWORK',
                materials: materials || []
            }
        });

        try {
            const assignmentsTag = getSchoolTag(CACHE_TAGS.ASSIGNMENTS, String(user.schoolId!));
            revalidateTag(assignmentsTag, 'max');
        } catch { /* non-blocking */ }

        // Audit log
        try {
            const _ip = request?.headers?.get('x-forwarded-for')?.split(',')[0]?.trim() || request?.headers?.get('cf-connecting-ip') || undefined;
            await logActivity({ userId: user.id, schoolId: user.schoolId, action: 'CREATE_ASSIGNMENT', resourceType: 'assignment', ip: _ip || undefined });
        } catch { /* non-blocking */ }

        return NextResponse.json({ assignment });

    } catch (e) {
        return handleApiError(e);
    }
}

export async function PUT(request: Request) {
    try {
        const user = await requireRole(['TEACHER', 'HOMEROOM', 'PRINCIPAL']);
        const body = (await request.json().catch(() => ({}))) as any;
        const { id, ...data } = body;

        const assignment = await prisma.assignment.update({
            where: { id, schoolId: user.schoolId!, teacherId: user.role !== 'PRINCIPAL' ? user.id : undefined },
            data: {
                ...data,
                dueDate: data.dueDate ? new Date(data.dueDate) : undefined
            }
        });

        try {
            const tag = getSchoolTag(CACHE_TAGS.ASSIGNMENTS, String(user.schoolId!));
            revalidateTag(tag, 'max');
            revalidateTag(`assignment-${id}`, 'max');
        } catch { /* non-blocking */ }

        // Audit log
        try {
            const _ip = request?.headers?.get('x-forwarded-for')?.split(',')[0]?.trim() || request?.headers?.get('cf-connecting-ip') || undefined;
            await logActivity({ userId: user.id, schoolId: user.schoolId, action: 'UPDATE_ASSIGNMENT', resourceType: 'assignment', ip: _ip || undefined });
        } catch { /* non-blocking */ }

        return NextResponse.json({ assignment });

    } catch (e) {
        return handleApiError(e);
    }
}

export async function DELETE(request: Request) {
    try {
        const user = await requireRole(['TEACHER', 'HOMEROOM', 'PRINCIPAL']);
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

        await prisma.assignment.delete({
            where: { id, schoolId: user.schoolId!, teacherId: user.role !== 'PRINCIPAL' ? user.id : undefined }
        });

        try {
            const tag = getSchoolTag(CACHE_TAGS.ASSIGNMENTS, String(user.schoolId!));
            revalidateTag(tag, 'max');
        } catch { /* non-blocking */ }

        // Audit log
        try {
            const _ip = request?.headers?.get('x-forwarded-for')?.split(',')[0]?.trim() || request?.headers?.get('cf-connecting-ip') || undefined;
            await logActivity({ userId: user.id, schoolId: user.schoolId, action: 'DELETE_ASSIGNMENT', resourceType: 'assignment', ip: _ip || undefined });
        } catch { /* non-blocking */ }

        return NextResponse.json({ success: true });

    } catch (e) {
        return handleApiError(e);
    }
}
