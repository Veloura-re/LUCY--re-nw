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
        revalidateTag(scTag);
        revalidateTag(`assignment-${submission.assignmentId}`);

        return NextResponse.json({ submission: updatedSubmission });

    } catch (e) {
        return handleApiError(e);
    }
}
