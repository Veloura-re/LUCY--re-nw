import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendAssessmentReportEmail } from "@/lib/email";
import { requireRole, requireSchoolLinked, handleApiError } from "@/lib/security";

import { logActivity } from '@/lib/audit';
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    try {
        const dbUser = await requireRole(['TEACHER', 'HOMEROOM', 'PRINCIPAL']);

        const body = (await req.json()) as any;
        const { questions, isLocked, isPublished, title, duration, config } = body;

        // Verify ownership?
        const exam = await prisma.exam.findUnique({
            where: { id },
            include: { class: { select: { schoolId: true, grade: { select: { schoolId: true } } } } }
        });
        if (!exam) return NextResponse.json({ error: "Not found" }, { status: 404 });
        const examSchoolId = exam.class?.grade?.schoolId ?? exam.class?.schoolId;
        if (!dbUser.schoolId || examSchoolId !== dbUser.schoolId) {
            // Indistinguishable from a missing exam so cross-tenant ids cannot be probed.
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }
        if (exam.createdById !== dbUser.id && dbUser.role !== 'PRINCIPAL') {
            return NextResponse.json({ error: "Access Denied" }, { status: 403 });
        }

        const computedMaxScore = questions && Array.isArray(questions)
            ? questions.reduce((acc: number, q: any) => acc + (parseFloat(q.points) || 0), 0)
            : undefined;

        const updated = await prisma.exam.update({
            where: { id },
            data: {
                questions: questions ?? undefined,
                isLocked: isLocked ?? undefined,
                isPublished: isPublished ?? undefined,
                title: title ?? undefined,
                duration: duration ?? undefined,
                totalMarks: computedMaxScore ?? undefined,
                config: config ?? (computedMaxScore !== undefined ? { ...((exam.config as any) || {}), maxScore: computedMaxScore } : undefined),
            } as any,
            include: {
                subject: true,
                class: {
                    include: {
                        grade: true
                    }
                }
            }
        });

        // NOTIFICATION LOGIC: Trigger if just published
        if (isPublished === true && !(exam as any).isPublished) {
            const schoolId = (updated as any).class.grade.schoolId;
            console.log(`[EXAM_PUBLISH] Triggering notifications for Exam: ${updated.id} in School: ${schoolId}`);

            // Fetch all students in the class and their grades/attendance for this exam
            const students = await prisma.student.findMany({
                where: { classId: updated.classId },
                include: {
                    parentLinks: { include: { parent: true } },
                    gradeRecords: { where: { examId: id } },
                    attendanceRecords: { where: { examId: id } }
                }
            });

            const maxScore = (updated.config as any)?.maxScore || 100;

            console.log(`[EXAM_PUBLISH] Notifying ${students.length} students/parents.`);

            for (const student of students) {
                const grade = student.gradeRecords[0];
                const att = student.attendanceRecords[0];
                const studentName = `${student.firstName} ${student.lastName}`;

                // If neither grade nor attendance found, skip (unlikely if graded properly)
                if (!grade && !att) continue;

                for (const link of student.parentLinks) {
                    if (link.parent.email) {
                        // Background send-off
                        sendAssessmentReportEmail(
                            link.parent.email,
                            studentName,
                            updated.title,
                            (updated as any).subject.name,
                            grade?.score || 0,
                            maxScore,
                            att?.status || 'PRESENT',
                            schoolId,
                            grade?.remark || undefined
                        ).catch(err => console.error(`Failed to notify parent of student ${student.id}:`, err));
                    }
                }
            }
        }

        
        // Audit log
        try {
            const _ip = req?.headers?.get('x-forwarded-for')?.split(',')[0]?.trim() || req?.headers?.get('cf-connecting-ip') || undefined;
            const _userId = dbUser?.id ?? undefined;
            if (_userId) {
                await logActivity({ userId: _userId, action: 'UPDATE', resourceType: 'exam', ip: _ip || undefined });
            }
        } catch { /* non-blocking */ }
return NextResponse.json({ exam: updated });
    } catch (e) {
        return handleApiError(e);
    }
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    try {
        const dbUser = await requireSchoolLinked();
        const exam = await prisma.exam.findUnique({
            where: { id },
            include: { subject: true, class: { include: { grade: { select: { schoolId: true } } } } }
        });
        const examSchoolId = exam?.class?.grade?.schoolId ?? exam?.class?.schoolId;
        if (!exam || !dbUser.schoolId || examSchoolId !== dbUser.schoolId) {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }
        return NextResponse.json({ exam });
    } catch (e) {
        return handleApiError(e);
    }
}
