import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole, handleApiError } from '@/lib/security';
import { revalidateTag } from 'next/cache';
import { CACHE_TAGS, getSchoolTag } from '@/lib/cache-keys';

import { logActivity } from '@/lib/audit';
export async function GET(request: Request) {
    try {
        const user = await requireRole(['STUDENT']);
        
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

        const assignmentsData = assignments.map(a => ({
            ...a,
            submission: a.submissions[0] || null
        }));

        return NextResponse.json({ assignments: assignmentsData });

    } catch (e) {
        return handleApiError(e);
    }
}

export async function POST(request: Request) {
    try {
        const user = await requireRole(['STUDENT']);
        const body = (await request.json().catch(() => ({}))) as { assignmentId: string; content: string; attachments?: string[] };
        
        const { assignmentId, content, attachments } = body;

        const student = await prisma.student.findUnique({
            where: { userId: user.id }
        });

        if (!student) return NextResponse.json({ error: "Student profile not found" }, { status: 404 });

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

        // Invalidate student-specific caches
        try {
            revalidateTag(getSchoolTag(CACHE_TAGS.ASSIGNMENTS, student.schoolId), 'max');
            revalidateTag(`student-${student.id}-assignments`, 'max');
            revalidateTag(`assignment-${assignmentId}`, 'max');
        } catch { /* non-blocking */ }

        // Asynchronous non-blocking background AI essay analysis (>= 30 words)
        if (content && content.trim().split(/\s+/).filter(Boolean).length >= 30) {
            (async () => {
                try {
                    const assignmentMeta = await prisma.assignment.findUnique({
                        where: { id: assignmentId },
                        include: { subject: true }
                    });
                    if (assignmentMeta) {
                        const { scanEssaySubmission } = await import('@/lib/ai');
                        const { createAiObservationContext } = await import('@/lib/ai-observability');
                        const scanResult = await scanEssaySubmission({
                            title: assignmentMeta.title,
                            description: assignmentMeta.description || '',
                            content,
                            subject: assignmentMeta.subject?.name || 'General Academic',
                            maxScore: assignmentMeta.maxScore || 100
                        }, createAiObservationContext({ distinctId: user.id, spanName: 'background_essay_scan' }));
                        await prisma.assignmentSubmission.update({
                            where: { id: submission.id },
                            data: { aiScanResult: scanResult as any } as any
                        });
                    }
                } catch (err) {
                    console.error('[Background AI Essay Scan Error]', err);
                }
            })().catch(() => {});
        }

        // Audit log
        try {
            const _ip = request?.headers?.get('x-forwarded-for')?.split(',')[0]?.trim() || request?.headers?.get('cf-connecting-ip') || undefined;
            await logActivity({ userId: user.id, schoolId: student.schoolId, action: 'SUBMIT_ASSIGNMENT', resourceType: 'assignment', ip: _ip || undefined });
        } catch { /* non-blocking */ }

        return NextResponse.json({ submission });

    } catch (e) {
        return handleApiError(e);
    }
}
