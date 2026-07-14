import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/utils/supabase/server";

export async function POST(req: Request) {
    try {
        const supabase = await createClient();
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const body = (await req.json()) as any;
        const { configId, examId } = body;

        if (!configId) {
            return NextResponse.json({ error: "Missing configId" }, { status: 400 });
        }

        const config = await (prisma as any).marklistConfig.findUnique({
            where: { id: configId },
            include: {
                entries: true,
                class: true,
                subject: true
            }
        });

        if (!config) {
            return NextResponse.json({ error: "Marklist configuration not found" }, { status: 404 });
        }

        let targetExamId = examId;

        if (!targetExamId) {
            // Try to find a suitable exam to sync to
            const potentialExam = await (prisma as any).exam.findFirst({
                where: {
                    classId: config.classId,
                    subjectId: config.subjectId,
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
                        createdById: config.teacherId || authUser.id,
                        isPublished: true
                    }
                });
                targetExamId = newExam.id;
            }
        }

        const stats = await (prisma as any).$transaction(async (tx: any) => {
            const targetExam = await tx.exam.findUnique({
                where: { id: targetExamId },
                select: { totalMarks: true }
            });
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
                            createdById: authUser.id,
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
            return { updatedCount };
        });

        
        // Audit log
        try {
            const { logActivity } = await import('@/lib/audit');
            const _ip = request instanceof Request ? (request.headers.get('x-forwarded-for') || request.headers.get('cf-connecting-ip') || undefined) : undefined;
            const _userId = (typeof user !== 'undefined' && user?.id) ? user.id : undefined;
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
