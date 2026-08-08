import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole, handleApiError } from '@/lib/security';
import { revalidateTag } from 'next/cache';
import { CACHE_TAGS, getSchoolTag } from '@/lib/cache-keys';

export async function GET(request: Request) {
    try {
        const user = await requireRole(['STUDENT']);
        
        let student;
        let assignmentsData = [];

        if (!prisma) {
            const { createClient } = require('@supabase/supabase-js');
            const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
            const { data } = await supabaseAdmin
                .from('Student')
                .select('id, classId, schoolId')
                .eq('userId', user.id)
                .single();
            student = data;

            if (!student || !student.classId) {
                return NextResponse.json({ assignments: [] });
            }

            const { data: assignments } = await supabaseAdmin
                .from('Assignment')
                .select('*, subject:Subject(name), teacher:User(name), submissions:AssignmentSubmission(status, submittedAt, grade, feedback, studentId)')
                .eq('classId', student.classId)
                .eq('schoolId', student.schoolId)
                .eq('isPublished', true)
                .order('dueDate', { ascending: true });

            assignmentsData = (assignments || []).map((a: any) => {
                const studentSubmissions = (a.submissions || []).filter((sub: any) => sub.studentId === student.id);
                return {
                    ...a,
                    submission: studentSubmissions[0] || null
                };
            });
        } else {
            student = await prisma.student.findUnique({
                where: { userId: user.id },
                select: { id: true, classId: true, schoolId: true }
            });

            if (!student || !student.classId) {
                return NextResponse.json({ assignments: [] });
            }

            const assignments = await prisma.assignment.findMany({
                where: { 
                    classId: student.classId, 
                    schoolId: student.schoolId,
                    isPublished: true 
                },
                include: {
                    subject: { select: { name: true } },
                    teacher: { select: { name: true } },
                    submissions: {
                        where: { studentId: student.id },
                        select: { status: true, submittedAt: true, grade: true, feedback: true }
                    }
                },
                orderBy: { dueDate: 'asc' }
            });

            assignmentsData = assignments.map(a => ({
                ...a,
                submission: a.submissions[0] || null
            }));
        }

        return NextResponse.json({ assignments: assignmentsData });

    } catch (e) {
        return handleApiError(e);
    }
}

export async function POST(request: Request) {
    try {
        const user = await requireRole(['STUDENT']);
        const body = await request.json() as { assignmentId: string; content: string; attachments?: string[] };
        
        const { assignmentId, content, attachments } = body;

        let student;
        let submission;

        if (!prisma) {
            const { createClient } = require('@supabase/supabase-js');
            const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
            const { data: studentData } = await supabaseAdmin
                .from('Student')
                .select('*')
                .eq('userId', user.id)
                .single();
            student = studentData;

            if (!student) return NextResponse.json({ error: "Student profile not found" }, { status: 404 });

            // Check if already submitted (Upsert pattern in REST)
            const { data: existing } = await supabaseAdmin
                .from('AssignmentSubmission')
                .select('id')
                .eq('assignmentId', assignmentId)
                .eq('studentId', student.id)
                .maybeSingle();

            if (existing) {
                const { data: updated } = await supabaseAdmin
                    .from('AssignmentSubmission')
                    .update({
                        content,
                        attachments: attachments || [],
                        submittedAt: new Date().toISOString(),
                        status: 'SUBMITTED',
                        schoolId: student.schoolId
                    })
                    .eq('id', existing.id)
                    .select()
                    .single();
                submission = updated;
            } else {
                const { data: created } = await supabaseAdmin
                    .from('AssignmentSubmission')
                    .insert({
                        assignmentId,
                        studentId: student.id,
                        schoolId: student.schoolId,
                        content,
                        attachments: attachments || [],
                        status: 'SUBMITTED',
                        submittedAt: new Date().toISOString()
                    })
                    .select()
                    .single();
                submission = created;
            }
        } else {
            student = await prisma.student.findUnique({
                where: { userId: user.id }
            });

            if (!student) return NextResponse.json({ error: "Student profile not found" }, { status: 404 });

            submission = await prisma.assignmentSubmission.upsert({
                where: {
                    assignmentId_studentId: {
                        assignmentId,
                        studentId: student.id
                    }
                },
                update: {
                    content,
                    attachments: attachments || [],
                    submittedAt: new Date(),
                    status: 'SUBMITTED',
                    schoolId: student.schoolId
                },
                create: {
                    assignmentId,
                    studentId: student.id,
                    schoolId: student.schoolId,
                    content,
                    attachments: attachments || [],
                    status: 'SUBMITTED'
                }
            });
        }

        // Invalidate student-specific caches
        revalidateTag(getSchoolTag(CACHE_TAGS.ASSIGNMENTS, student.schoolId), 'max');
        revalidateTag(`student-${student.id}-assignments`, 'max');
        revalidateTag(`assignment-${assignmentId}`, 'max');

        
        // Audit log
        try {
            const { logActivity } = await import('@/lib/audit');
            const _ip = request?.headers?.get('x-forwarded-for')?.split(',')[0]?.trim() || request?.headers?.get('cf-connecting-ip') || undefined;
            const _userId = user?.id ?? undefined;
            if (_userId) {
                await logActivity({ userId: _userId, action: 'CREATE', resourceType: 'assignment', ip: _ip || undefined });
            }
        } catch { /* non-blocking */ }
return NextResponse.json({ submission });

    } catch (e) {
        return handleApiError(e);
    }
}
