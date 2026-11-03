import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, publicErrorMessage, handleApiError, clientDataError } from "@/lib/security";
import { logActivity } from "@/lib/audit";
import { reportServerError } from '@/lib/error-capture';

// GET: Fetch Grid Data (Entries + Marks)
export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const configId = searchParams.get("configId");

    if (!configId) {
        return NextResponse.json({ error: "Missing configId" }, { status: 400 });
    }

    try {
        const user = await requireRole(['SUPERADMIN', 'OWNER', 'PRINCIPAL', 'TEACHER', 'HOMEROOM']);

        // Return all entries with their marks for this config
        const entries = await (prisma as any).marklistEntry.findMany({
            where: { configId },
            include: {
                student: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        studentCode: true
                    }
                },
                marks: true
            },
            orderBy: {
                student: { firstName: 'asc' }
            }
        });

        return NextResponse.json(entries);
    } catch (error) {
        { const bad = clientDataError(error); if (bad) return bad; }
        if (/^(Unauthorized|Forbidden)/.test(String((error as any)?.message))) return handleApiError(error);
        console.error("Fetch Entries Error:", error);
        return NextResponse.json({ error: "Failed to fetch entries" }, { status: 500 });
    }
}

// POST: Save Marks (Bulk Update)
export async function POST(req: Request) {
    try {
        const user = await requireRole(['SUPERADMIN', 'OWNER', 'PRINCIPAL', 'TEACHER', 'HOMEROOM']);
        const body = (await req.json()) as any;
        const { configId, updates } = body;

        if (!configId) {
            return NextResponse.json({ error: "Configuration ID Missing" }, { status: 400 });
        }

        if (!updates || !Array.isArray(updates) || updates.length === 0) {
            return NextResponse.json({ error: "No changes detected to commit" }, { status: 400 });
        }

        let schoolIdForAudit = user.schoolId;

        await (prisma as any).$transaction(async (tx: any) => {
            const config = await tx.marklistConfig.findUnique({
                where: { id: configId },
                include: {
                    columns: true,
                    class: {
                        select: {
                            id: true,
                            name: true,
                            schoolId: true,
                            homeroomTeacherId: true
                        }
                    },
                    term: true
                }
            });

            if (!config) throw new Error("Config not found");

            if (config.schoolId) {
                schoolIdForAudit = config.schoolId;
            }

            // Enforce school isolation
            if (user.role !== 'SUPERADMIN' && config.schoolId !== user.schoolId) {
                throw new Error("unauthorized_school");
            }

            // Term completion guard: If term is completed, disallow faculty edits
            if (['TEACHER', 'HOMEROOM'].includes(user.role)) {
                let isTermCompleted = false;

                if (config.term) {
                    const isTermInactive = !config.term.isActive;
                    const isTermPastEndDate = config.term.endDate ? new Date() > new Date(config.term.endDate) : false;
                    isTermCompleted = isTermInactive || isTermPastEndDate;
                } else if (config.schoolId) {
                    // Check if school has an active live term
                    const activeTerm = await tx.academicTerm.findFirst({
                        where: { schoolId: config.schoolId, isActive: true }
                    });
                    // If school has terms configured but none active, editing is locked
                    const totalTerms = await tx.academicTerm.count({
                        where: { schoolId: config.schoolId }
                    });
                    if (totalTerms > 0 && !activeTerm) {
                        isTermCompleted = true;
                    }
                }

                if (isTermCompleted) {
                    throw new Error("term_completed");
                }

                if (config.isLocked) {
                    throw new Error("marklist_locked");
                }
            }

            // Comprehensive Teacher/Homeroom verification
            if (['TEACHER', 'HOMEROOM'].includes(user.role)) {
                let isAuthorized = false;

                // 1. Direct configuration teacher assignment
                if (config.teacherId === user.id) {
                    isAuthorized = true;
                }

                // 2. Homeroom teacher for this class
                if (!isAuthorized && config.class?.homeroomTeacherId === user.id) {
                    isAuthorized = true;
                }

                // 3. Exact TeacherAssignment (teacher + class + subject)
                if (!isAuthorized) {
                    const exactAssignment = await tx.teacherAssignment.findFirst({
                        where: {
                            teacherId: user.id,
                            classId: config.classId,
                            subjectId: config.subjectId
                        }
                    });
                    if (exactAssignment) isAuthorized = true;
                }

                // 4. Class-level TeacherAssignment (assigned to this class)
                if (!isAuthorized) {
                    const classAssignment = await tx.teacherAssignment.findFirst({
                        where: {
                            teacherId: user.id,
                            classId: config.classId
                        }
                    });
                    if (classAssignment) isAuthorized = true;
                }

                // 5. Timetable schedule slot for this teacher, class, and subject
                if (!isAuthorized) {
                    const timetableSlot = await tx.timetable.findFirst({
                        where: {
                            teacherId: user.id,
                            classId: config.classId,
                            subjectId: config.subjectId
                        }
                    });
                    if (timetableSlot) isAuthorized = true;
                }

                // 6. Timetable schedule slot for this teacher in this class
                if (!isAuthorized) {
                    const classTimetableSlot = await tx.timetable.findFirst({
                        where: {
                            teacherId: user.id,
                            classId: config.classId
                        }
                    });
                    if (classTimetableSlot) isAuthorized = true;
                }

                if (!isAuthorized) {
                    throw new Error("unauthorized_teacher");
                }
            }

            for (const update of updates) {
                const { studentId, marks, remarks } = update;

                const entry = await tx.marklistEntry.upsert({
                    where: { configId_studentId: { configId, studentId } },
                    create: { configId, studentId, remarks: remarks || null },
                    update: { remarks: remarks || null }
                });

                // Upsert individual marks if provided
                if (marks && Array.isArray(marks)) {
                    for (const m of marks) {
                        if (m.score === null || m.score === undefined || m.score === "") {
                            await tx.marklistMark.deleteMany({
                                where: { entryId: entry.id, columnId: m.columnId }
                            });
                        } else {
                            const scoreVal = isNaN(parseFloat(m.score)) ? 0 : parseFloat(m.score);
                            await tx.marklistMark.upsert({
                                where: { entryId_columnId: { entryId: entry.id, columnId: m.columnId } },
                                update: { score: scoreVal },
                                create: { entryId: entry.id, columnId: m.columnId, score: scoreVal }
                            });
                        }
                    }
                }

                // Recalculate Totals for this entry
                const currentEntry = await tx.marklistEntry.findUnique({
                    where: { id: entry.id },
                    include: { marks: true }
                });

                if (currentEntry) {
                    let total = 0;
                    let totalMaxMarks = 0;

                    config.columns.forEach((col: any) => {
                        const mark = currentEntry.marks.find((m: any) => m.columnId === col.id);
                        if (mark !== undefined && mark !== null) {
                            const score = parseFloat(mark.score) || 0;
                            total += score;
                            totalMaxMarks += col.maxMarks;
                        }
                    });

                    const percentage = totalMaxMarks > 0 ? (total / totalMaxMarks) * 100 : 0;

                    // Manual Grade Rules
                    let grade = "F";
                    if (percentage >= 90) grade = "A+";
                    else if (percentage >= 80) grade = "A";
                    else if (percentage >= 70) grade = "B";
                    else if (percentage >= 60) grade = "C";
                    else if (percentage >= 50) grade = "D";
                    else if (percentage >= 40) grade = "E";

                    await tx.marklistEntry.update({
                        where: { id: currentEntry.id },
                        data: { total, percentage, grade }
                    });
                }
            }
        });

        // Audit log with guaranteed non-null schoolId
        if (schoolIdForAudit) {
            try {
                const ip = req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || undefined;
                await logActivity({
                    userId: user.id,
                    schoolId: schoolIdForAudit,
                    action: 'UPDATE_MARKLIST_SCORES',
                    resourceType: 'MARKLIST_CONFIG',
                    resourceId: configId,
                    ip
                });
            } catch (auditErr) {
                console.error("Audit logging non-blocking error:", auditErr);
            }
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        if (/^(Unauthorized|Forbidden)/.test(String(error?.message))) return handleApiError(error);
        console.error("Save Marks Error:", error);
        if (error.message === "term_completed") {
            return NextResponse.json({
                error: "Academic term is completed. Marklists for finalized terms are read-only.",
                code: "TERM_COMPLETED"
            }, { status: 403 });
        }
        if (error.message === "marklist_locked") {
            return NextResponse.json({
                error: "Marklist is locked by administration. Modifications are prohibited.",
                code: "MARKLIST_LOCKED"
            }, { status: 403 });
        }
        if (error.message === "unauthorized_teacher") {
            return NextResponse.json({
                error: "You are not assigned to teach or manage this class subject.",
                code: "UNAUTHORIZED_TEACHER"
            }, { status: 403 });
        }
        if (error.message === "unauthorized_school") {
            return NextResponse.json({
                error: "Access denied: Class belongs to a different school tenant.",
                code: "UNAUTHORIZED_TENANT"
            }, { status: 403 });
        }
        void reportServerError(error, { status: 500 });
        return NextResponse.json({ error: publicErrorMessage(error, "Failed to save marks") }, { status: 500 });
    }
}
