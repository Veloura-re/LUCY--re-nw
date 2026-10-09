import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/security";
import { logActivity } from "@/lib/audit";
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
                class: {
                    select: {
                        id: true,
                        name: true,
                        homeroomTeacherId: true
                    }
                },
                subject: true,
                term: true
            }
        });

        if (!config) {
            return NextResponse.json({ error: "Marklist configuration not found or unauthorized" }, { status: 404 });
        }

        // Faculty permissions and term completion check
        if (['TEACHER', 'HOMEROOM'].includes(dbUser.role)) {
            if (config.term) {
                const isTermCompleted = !config.term.isActive || (config.term.endDate && new Date() > new Date(config.term.endDate));
                if (isTermCompleted) {
                    return NextResponse.json({
                        error: "Academic term is completed. Marklists for finalized terms are read-only.",
                        code: "TERM_COMPLETED"
                    }, { status: 403 });
                }
            }

            if (config.isLocked) {
                return NextResponse.json({
                    error: "Marklist is locked by administration.",
                    code: "MARKLIST_LOCKED"
                }, { status: 403 });
            }

            let isAuthorized = config.teacherId === dbUser.id || config.class?.homeroomTeacherId === dbUser.id;
            if (!isAuthorized) {
                const assignment = await prisma.teacherAssignment.findFirst({
                    where: { teacherId: dbUser.id, classId: config.classId, subjectId: config.subjectId }
                });
                if (assignment) isAuthorized = true;
            }
            if (!isAuthorized) {
                const classAssignment = await prisma.teacherAssignment.findFirst({
                    where: { teacherId: dbUser.id, classId: config.classId }
                });
                if (classAssignment) isAuthorized = true;
            }
            if (!isAuthorized) {
                const timetable = await prisma.timetable.findFirst({
                    where: { teacherId: dbUser.id, classId: config.classId, subjectId: config.subjectId }
                });
                if (timetable) isAuthorized = true;
            }

            if (!isAuthorized) {
                return NextResponse.json({
                    error: "You are not authorized to sync grades for this class subject.",
                    code: "UNAUTHORIZED_TEACHER"
                }, { status: 403 });
            }
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

        // Audit log with valid schoolId
        if (schoolId) {
            try {
                const _ip = req?.headers?.get('x-forwarded-for')?.split(',')[0]?.trim() || req?.headers?.get('cf-connecting-ip') || undefined;
                await logActivity({
                    userId: dbUser.id,
                    schoolId,
                    action: 'SYNC_MARKLIST_TO_GRADEBOOK',
                    resourceType: 'MARKLIST_CONFIG',
                    resourceId: configId,
                    ip: _ip
                });
            } catch (auditErr) {
                console.error("Audit log error:", auditErr);
            }
        }

        return NextResponse.json({ success: true, ...stats });
    } catch (error) {
        console.error("Marklist Sync Error:", error);
        return NextResponse.json({ error: "Failed to sync marklist" }, { status: 500 });
    }
}

