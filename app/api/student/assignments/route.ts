import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole, handleApiError } from '@/lib/security';
import { revalidateTag } from 'next/cache';
import { CACHE_TAGS, getSchoolTag } from '@/lib/cache-keys';

export async function GET(request: Request) {
    try {
        const user = await requireRole(['STUDENT']);
        const { searchParams } = new URL(request.url);
        
        // Find the student record for this user
        const student = await prisma.student.findUnique({
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

        return NextResponse.json({ 
            assignments: assignments.map(a => ({
                ...a,
                submission: a.submissions[0] || null
            }))
        });

    } catch (e) {
        return handleApiError(e);
    }
}

export async function POST(request: Request) {
    try {
        const user = await requireRole(['STUDENT']);
        const body = await request.json();
        
        const { assignmentId, content, attachments } = body;

        const student = await prisma.student.findUnique({
            where: { userId: user.id }
        });

        if (!student) return NextResponse.json({ error: "Student profile not found" }, { status: 404 });

        // Check if already submitted (Upsert pattern)
        const submission = await prisma.assignmentSubmission.upsert({
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
                status: 'SUBMITTED', // Reset if it was revision_required
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

        // Invalidate student-specific caches
        revalidateTag(getSchoolTag(CACHE_TAGS.ASSIGNMENTS, student.schoolId), 'max');
        revalidateTag(`student-${student.id}-assignments`, 'max');
        revalidateTag(`assignment-${assignmentId}`, 'max');

        return NextResponse.json({ submission });

    } catch (e) {
        return handleApiError(e);
    }
}
