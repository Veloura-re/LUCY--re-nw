import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole, handleApiError } from '@/lib/security';
import { revalidateTag } from 'next/cache';
import { CACHE_TAGS, getSchoolTag } from '@/lib/cache-keys';

export async function GET(request: Request) {
    try {
        const user = await requireRole(['OWNER', 'TEACHER', 'HOMEROOM', 'PRINCIPAL', 'SUPERADMIN']);
        const { searchParams } = new URL(request.url);
        
        const classId = searchParams.get('classId');
        const assignmentId = searchParams.get('id');

        if (assignmentId) {
            let assignment;
            if (!prisma) {
                const { createClient } = require('@supabase/supabase-js');
                const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
                const { data, error } = await supabaseAdmin.from('Assignment')
                    .select('*, class:Class(name), subject:Subject(name), submissions:AssignmentSubmission(*, student:Student(firstName, lastName, studentCode))')
                    .eq('id', assignmentId)
                    .eq('schoolId', user.schoolId!)
                    .single();
                if (error) throw new Error(error.message);
                assignment = data;
            } else {
                assignment = await prisma.assignment.findUnique({
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
            }
            return NextResponse.json({ assignment });
        }

        if (classId) {
            let assignments;
            if (!prisma) {
                const { createClient } = require('@supabase/supabase-js');
                const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
                // Complex aggregate query is harder in REST, fetch related data separately or use simpler format
                const { data, error } = await supabaseAdmin.from('Assignment')
                    .select('*, subject:Subject(name)')
                    .eq('classId', classId)
                    .eq('schoolId', user.schoolId!)
                    .order('dueDate', { ascending: false });
                if (error) throw new Error(error.message);
                // We'd manually attach _count.submissions here if needed, but omitted for edge speed
                assignments = data;
            } else {
                assignments = await prisma.assignment.findMany({
                    where: { classId, schoolId: user.schoolId! },
                    include: {
                        subject: { select: { name: true } },
                        _count: { select: { submissions: true } }
                    },
                    orderBy: { dueDate: 'desc' }
                });
            }
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
        const body = (await request.json()) as any;
        const { title, description, classId, subjectId, dueDate, type, materials } = body;

        let assignment;

        if (!prisma) {
            const { createClient } = require('@supabase/supabase-js');
            const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
            
            const { data, error } = await supabaseAdmin.from('Assignment').insert({
                id: crypto.randomUUID(),
                schoolId: user.schoolId!,
                teacherId: user.id,
                classId,
                subjectId,
                title,
                description,
                dueDate: new Date(dueDate).toISOString(),
                type: type || 'HOMEWORK',
                materials: materials || [],
                updatedAt: new Date().toISOString()
            }).select().single();

            if (error) throw new Error(error.message);
            assignment = data;
        } else {
            assignment = await prisma.assignment.create({
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
        }

        const assignmentsTag = getSchoolTag(CACHE_TAGS.ASSIGNMENTS, String(user.schoolId!));
        revalidateTag(assignmentsTag, 'max');

        
        // Audit log
        try {
            const { logActivity } = await import('@/lib/audit');
            const _ip = request instanceof Request ? (request.headers.get('x-forwarded-for') || request.headers.get('cf-connecting-ip') || undefined) : undefined;
            const _userId = (typeof user !== 'undefined' && user?.id) ? user.id : undefined;
            if (_userId) {
                await logActivity({ userId: _userId, action: 'CREATE', resourceType: 'assignment', ip: _ip || undefined });
            }
        } catch { /* non-blocking */ }
return NextResponse.json({ assignment });

    } catch (e) {
        return handleApiError(e);
    }
}

export async function PUT(request: Request) {
    try {
        const user = await requireRole(['TEACHER', 'HOMEROOM', 'PRINCIPAL']);
        const body = (await request.json()) as any;
        const { id, ...data } = body;

        const assignment = await prisma.assignment.update({
            where: { id, schoolId: user.schoolId!, teacherId: user.role !== 'PRINCIPAL' ? user.id : undefined },
            data: {
                ...data,
                dueDate: data.dueDate ? new Date(data.dueDate) : undefined
            }
        });

        const tag = getSchoolTag(CACHE_TAGS.ASSIGNMENTS, String(user.schoolId!));
        revalidateTag(tag, 'max');
        revalidateTag(`assignment-${id}`, 'max');

        
        // Audit log
        try {
            const { logActivity } = await import('@/lib/audit');
            const _ip = request instanceof Request ? (request.headers.get('x-forwarded-for') || request.headers.get('cf-connecting-ip') || undefined) : undefined;
            const _userId = (typeof user !== 'undefined' && user?.id) ? user.id : undefined;
            if (_userId) {
                await logActivity({ userId: _userId, action: 'UPDATE', resourceType: 'assignment', ip: _ip || undefined });
            }
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

        const tag = getSchoolTag(CACHE_TAGS.ASSIGNMENTS, String(user.schoolId!));
        revalidateTag(tag, 'max');

        
        // Audit log
        try {
            const { logActivity } = await import('@/lib/audit');
            const _ip = request instanceof Request ? (request.headers.get('x-forwarded-for') || request.headers.get('cf-connecting-ip') || undefined) : undefined;
            const _userId = (typeof user !== 'undefined' && user?.id) ? user.id : undefined;
            if (_userId) {
                await logActivity({ userId: _userId, action: 'DELETE', resourceType: 'assignment', ip: _ip || undefined });
            }
        } catch { /* non-blocking */ }
return NextResponse.json({ success: true });

    } catch (e) {
        return handleApiError(e);
    }
}
