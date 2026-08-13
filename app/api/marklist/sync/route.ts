import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/security";
import { revalidateTag } from "next/cache";
import { CACHE_TAGS, getSchoolTag } from "@/lib/cache-keys";

export async function POST(req: Request) {
    try {
        const dbUser = await requireRole(['OWNER', 'PRINCIPAL', 'TEACHER', 'HOMEROOM', 'SUPERADMIN']);
        const schoolId = dbUser.schoolId;

        const body = (await req.json()) as { configId?: string; examId?: string };
        const { configId, examId } = body;

        if (!configId) {
            return NextResponse.json({ error: "Missing configId" }, { status: 400 });
        }

        const config = await (prisma as any).marklistConfig.findFirst({
            where: { 
                id: configId,
                ...(dbUser.role === 'SUPERADMIN' ? {} : { class: { schoolId: schoolId! } })
            },
            include: {
                entries: true,
                class: true,
                subject: true
            }
        });

        if (!config) {
            return NextResponse.json({ error: "Marklist configuration not found or unauthorized" }, { status: 404 });
        }

        let targetExamId = examId;

        if (!targetExamId) {
            // Try to find a suitable exam to sync to within the school
            const potentialExam = await (prisma as any).exam.findFirst({
                where: {
                    classId: config.classId,
                    subjectId: config.subjectId,
                    ...(dbUser.role === 'SUPERADMIN' ? {} : { class: { schoolId: schoolId! } }),
                    OR: [
                        { category: 'FINAL_EXAM' },
                        { title: { contains: 'Final', mode: 'insensitive' } },
                        { title: { contains: 'Total', mode: 'insensitive' } },
                        { title: { contains: 'Cumulative', mode: 'insensitive' } }
                    ]
                }
            });

            if (potentialExam) {
                targetExamId = potentialExam.id;
            } else {
                // Auto-create a cumulative result exam if none exists
                const newExam = await (prisma as any).exam.create({
                    data: {
                        title: "Cumulative Marklist Result",
                        category: "FINAL_EXAM",
                        totalMarks: 100,
                        availableFrom: new Date(),
                        classId: config.classId,
                        subjectId: config.subjectId,
                        createdById: config.teacherId || dbUser.id,
                        isPublished: true
                    }
                });
                targetExamId = newExam.id;
            }
        }

        const stats = await (prisma as any).$transaction(async (tx: any) => {
            const targetExam = await tx.exam.findFirst({
                where: { 
                    id: targetExamId,
                    classId: config.classId,
                    subjectId: config.subjectId,
                    ...(dbUser.role === 'SUPERADMIN' ? {} : { class: { schoolId: schoolId! } })
                },
                select: { totalMarks: true, isLocked: true }
            });

            if (!targetExam) {
                throw new Error("Target exam not found, not matching class/subject, or unauthorized");
            }

            if (targetExam.isLocked) {
                throw new Error("Cannot sync grades to a locked/sealed exam");
            }

            const examMaxMarks = targetExam?.totalMarks || 100;

            let updatedCount = 0;
            for (const entry of config.entries) {
                if (entry.percentage !== null) {
                    const scaledScore = (entry.percentage / 100) * examMaxMarks;

                    await tx.gradeRecord.upsert({
                        where: {
                            studentId_examId: {
                                studentId: entry.studentId,
                                examId: targetExamId
                            }
                        },
                        create: {
                            score: scaledScore,
                            studentId: entry.studentId,
                            examId: targetExamId,
                            subjectId: config.subjectId,
                            createdById: dbUser.id,
                            remark: entry.remarks || "Synced from Marklist",
                            status: 'SUBMITTED'
                        },
                        update: {
                            score: scaledScore,
                            remark: entry.remarks || "Synced from Marklist",
                            updatedAt: new Date()
                        }
                    });
                    updatedCount++;
                }
            }

            return { updatedCount, examId: targetExamId };
        });

        // Invalidate grades cache
        if (schoolId) {
            revalidateTag(getSchoolTag(CACHE_TAGS.GRADES, schoolId), 'max');
        }

        // Audit log
        try {
            const { logActivity } = await import('@/lib/audit');
            const _ip = req?.headers?.get('x-forwarded-for')?.split(',')[0]?.trim() || req?.headers?.get('cf-connecting-ip') || undefined;
            const _userId = dbUser?.id ?? undefined;
            if (_userId) {
                await logActivity({ userId: _userId, action: 'SYNC', resourceType: 'marklist', ip: _ip || undefined });
            }
        } catch { /* non-blocking */ }
return NextResponse.json({ success: true, ...stats });
    } catch (error) {
        console.error("Marklist Sync Error:", error);
        return NextResponse.json({ error: "Failed to sync marklist" }, { status: 500 });
    }
}
