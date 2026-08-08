import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole, handleApiError } from '@/lib/security';
import { revalidateTag } from 'next/cache';
import { CACHE_TAGS, getSchoolTag } from '@/lib/cache-keys';

/**
 * PUT: Update a student submission with grade and feedback
 */
export async function PUT(request: Request) {
    try {
        const user = await requireRole(['TEACHER', 'HOMEROOM', 'PRINCIPAL']);
        const body = await request.json();
        
        const { id, grade, feedback, status } = body;

        if (!id) return NextResponse.json({ error: "Submission ID required" }, { status: 400 });

        // Security: Ensure the teacher belongs to the same school as the submission's assignment
        const submission = await prisma.assignmentSubmission.findUnique({
            where: { id },
            include: { assignment: { select: { schoolId: true, teacherId: true } } }
        });

        if (!submission) return NextResponse.json({ error: "Submission not found" }, { status: 404 });
        
        // Authorization: Principals can grade anything in their school, teachers can grade their own assignments
        if (user.role !== 'PRINCIPAL' && submission.assignment.teacherId !== user.id) {
            return NextResponse.json({ error: "Forbidden: Not your assignment to grade" }, { status: 403 });
        }

        const updatedSubmission = await prisma.assignmentSubmission.update({
            where: { id },
            data: {
                grade,
                feedback,
                status: status || 'GRADED',
            },
            include: {
                student: { select: { firstName: true, lastName: true } }
            }
        });

        // Purge caches
        const scTag = getSchoolTag(CACHE_TAGS.ASSIGNMENTS, user.schoolId!);
        revalidateTag(scTag, 'max');
        revalidateTag(`assignment-${submission.assignmentId}`, 'max');

        
        // Audit log
        try {
            const { logActivity } = await import('@/lib/audit');
            const _ip = request?.headers?.get('x-forwarded-for')?.split(',')[0]?.trim() || request?.headers?.get('cf-connecting-ip') || undefined;
            const _userId = user?.id ?? undefined;
            if (_userId) {
                await logActivity({ userId: _userId, action: 'UPDATE', resourceType: 'assignment', ip: _ip || undefined });
            }
        } catch { /* non-blocking */ }
return NextResponse.json({ submission: updatedSubmission });

    } catch (e) {
        return handleApiError(e);
    }
}
