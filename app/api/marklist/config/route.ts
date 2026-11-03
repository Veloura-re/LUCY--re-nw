import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, requireSchoolLinked, handleApiError, clientDataError } from "@/lib/security";
import { logActivity } from "@/lib/audit";

export async function POST(req: Request) {
    try {
        const user = await requireRole(['SUPERADMIN', 'OWNER', 'PRINCIPAL', 'TEACHER', 'HOMEROOM']);
        const body = await req.json() as { classId: string; subjectId: string; teacherId: string; columns: any[]; termId?: string; schoolId?: string };
        const { classId, subjectId, teacherId, columns, termId } = body;

        // Strict schoolId resolution based on authenticated role
        const schoolId = user.role === 'SUPERADMIN' ? (body.schoolId || user.schoolId) : user.schoolId;

        if (!schoolId || !classId || !subjectId) {
            return NextResponse.json({ error: "Missing required identity fields" }, { status: 400 });
        }

        // Validate that target class belongs to this school
        const targetClass = await prisma.class.findFirst({
            where: {
                id: classId,
                ...(user.role === 'SUPERADMIN' ? {} : { schoolId })
            }
        });

        if (!targetClass) {
            return NextResponse.json({ error: "Class not found or unauthorized" }, { status: 404 });
        }

        // Validate that school has at least one academic term configured
        const termCount = await prisma.academicTerm.count({ where: { schoolId } });
        if (termCount === 0) {
            return NextResponse.json({ 
                error: "No academic terms found. Please create an academic term first in Settings.", 
                code: "NO_ACADEMIC_TERMS" 
            }, { status: 400 });
        }

        // Resolve termId (if not provided, auto-link to active term or latest term)
        let resolvedTermId = termId && termId !== "none" ? termId : null;
        if (!resolvedTermId) {
            const defaultTerm = await prisma.academicTerm.findFirst({
                where: { schoolId, isActive: true },
                select: { id: true }
            }) || await prisma.academicTerm.findFirst({
                where: { schoolId },
                orderBy: { createdAt: "desc" },
                select: { id: true }
            });
            resolvedTermId = defaultTerm?.id || null;
        }

        // 1. Creation or Update of Configuration
        const config = await (prisma as any).$transaction(async (tx: any) => {
            // Find existing config
            const existing = await tx.marklistConfig.findUnique({
                where: { classId_subjectId: { classId, subjectId } },
                include: { columns: true }
            });

            if (existing) {
                // Update basic info
                await tx.marklistConfig.update({
                    where: { id: existing.id },
                    data: { teacherId, termId: resolvedTermId, updatedAt: new Date() }
                });

                // Reconcile columns
                const existingColIds = existing.columns.map((c: any) => c.id);
                const incomingColIds = columns.filter((c: any) => c.id).map((c: any) => c.id);
                const toDelete = existingColIds.filter((id: string) => !incomingColIds.includes(id));

                if (toDelete.length > 0) {
                    await tx.marklistColumn.deleteMany({
                        where: { id: { in: toDelete } }
                    });
                }

                // Update/Create remaining
                for (const col of columns) {
                    if (col.id) {
                        await tx.marklistColumn.update({
                            where: { id: col.id },
                            data: {
                                title: col.title,
                                maxMarks: col.maxMarks,
                                order: col.order,
                                isOptional: col.isOptional
                            }
                        });
                    } else {
                        await tx.marklistColumn.create({
                            data: {
                                configId: existing.id,
                                title: col.title,
                                maxMarks: col.maxMarks,
                                order: col.order,
                                isOptional: col.isOptional
                            }
                        });
                    }
                }
                return await tx.marklistConfig.findUnique({
                    where: { id: existing.id },
                    include: { columns: true, term: true }
                });
            } else {
                // Create New
                return await tx.marklistConfig.create({
                    data: {
                        schoolId,
                        classId,
                        subjectId,
                        teacherId,
                        termId: resolvedTermId || null,
                        columns: {
                            create: columns.map((col: any) => ({
                                title: col.title,
                                maxMarks: col.maxMarks,
                                order: col.order || 0,
                                isOptional: col.isOptional || false
                            }))
                        }
                    },
                    include: { columns: true, term: true }
                });
            }
        });

        // 2. Ensure Sync with Students (Create Entry rows for all active students)
        const students = await prisma.student.findMany({
            where: {
                classId,
                enrollmentStatus: 'ACTIVE'
            },
            select: { id: true }
        });

        if (students.length > 0) {
            await Promise.all(students.map((student: { id: string }) =>
                (prisma as any).marklistEntry.upsert({
                    where: {
                        configId_studentId: { configId: config.id, studentId: student.id }
                    },
                    create: {
                        configId: config.id,
                        studentId: student.id
                    },
                    update: {}
                })
            ));
        }

        // Multi-tenant Audit Log
        if (schoolId) {
            try {
                const ip = req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || undefined;
                await logActivity({
                    userId: user.id,
                    schoolId,
                    action: 'UPDATE_MARKLIST_CONFIG',
                    resourceType: 'MARKLIST_CONFIG',
                    resourceId: config.id,
                    ip
                });
            } catch (auditErr) {
                { const bad = clientDataError(auditErr); if (bad) return bad; }
                if (/^(Unauthorized|Forbidden)/.test(String((auditErr as any)?.message))) return handleApiError(auditErr);
                console.error("Audit log error:", auditErr);
            }
        }

        return NextResponse.json(config);
    } catch (error) {
        { const bad = clientDataError(error); if (bad) return bad; }
        if (/^(Unauthorized|Forbidden)/.test(String((error as any)?.message))) return handleApiError(error);
        console.error("Config Error:", error);
        return NextResponse.json({ error: "Failed to save configuration" }, { status: 500 });
    }
}

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const classId = searchParams.get("classId");
    const subjectId = searchParams.get("subjectId");
    const id = searchParams.get("id");

    try {
        const user = await requireSchoolLinked();
        const schoolId = user.schoolId;

        const includeRelations = {
            columns: { orderBy: { order: 'asc' } },
            class: { select: { id: true, name: true, schoolId: true, homeroomTeacherId: true } },
            subject: { select: { id: true, name: true } },
            teacher: { select: { id: true, name: true } },
            term: { select: { id: true, name: true, isActive: true, startDate: true, endDate: true } }
        };

        let config: any = null;

        if (id) {
            config = await (prisma as any).marklistConfig.findFirst({
                where: { 
                    id,
                    class: { schoolId }
                },
                include: includeRelations
            });
        } else if (classId && subjectId) {
            config = await (prisma as any).marklistConfig.findFirst({
                where: { 
                    classId, 
                    subjectId,
                    class: { schoolId }
                },
                include: includeRelations
            });
        } else {
            return NextResponse.json({ error: "Missing identity params" }, { status: 400 });
        }

        if (!config) {
            return NextResponse.json(null);
        }

        // Calculate term completion & live status
        let isTermCompleted = false;
        let isLiveTerm = false;

        if (config.term) {
            const isTermInactive = !config.term.isActive;
            const isPastEndDate = config.term.endDate ? new Date() > new Date(config.term.endDate) : false;
            isTermCompleted = isTermInactive || isPastEndDate;
            isLiveTerm = config.term.isActive && !isPastEndDate;
        } else {
            const activeTerm = await prisma.academicTerm.findFirst({
                where: { schoolId, isActive: true }
            });
            const totalTerms = await prisma.academicTerm.count({ where: { schoolId } });
            if (totalTerms > 0 && !activeTerm) {
                isTermCompleted = true;
            } else if (activeTerm) {
                isLiveTerm = true;
            }
        }

        // Calculate whether current user is permitted to edit this marklist
        let canEdit = true;
        if (['TEACHER', 'HOMEROOM'].includes(user.role)) {
            if (isTermCompleted || config.isLocked) {
                canEdit = false;
            } else {
                let isAuthorized = false;
                if (config.teacherId === user.id) isAuthorized = true;
                if (!isAuthorized && config.class?.homeroomTeacherId === user.id) isAuthorized = true;

                if (!isAuthorized) {
                    const exactAssignment = await prisma.teacherAssignment.findFirst({
                        where: {
                            teacherId: user.id,
                            classId: config.classId,
                            subjectId: config.subjectId
                        }
                    });
                    if (exactAssignment) isAuthorized = true;
                }

                if (!isAuthorized) {
                    const classAssignment = await prisma.teacherAssignment.findFirst({
                        where: {
                            teacherId: user.id,
                            classId: config.classId
                        }
                    });
                    if (classAssignment) isAuthorized = true;
                }

                if (!isAuthorized) {
                    const timetableSlot = await prisma.timetable.findFirst({
                        where: {
                            teacherId: user.id,
                            classId: config.classId,
                            subjectId: config.subjectId
                        }
                    });
                    if (timetableSlot) isAuthorized = true;
                }

                if (!isAuthorized) {
                    const classTimetableSlot = await prisma.timetable.findFirst({
                        where: {
                            teacherId: user.id,
                            classId: config.classId
                        }
                    });
                    if (classTimetableSlot) isAuthorized = true;
                }

                canEdit = isAuthorized;
            }
        }

        return NextResponse.json({
            ...config,
            isLiveTerm,
            isTermCompleted,
            canEdit
        });
    } catch (error) {
        { const bad = clientDataError(error); if (bad) return bad; }
        if (/^(Unauthorized|Forbidden)/.test(String((error as any)?.message))) return handleApiError(error);
        console.error("Fetch Config Error:", error);
        return NextResponse.json({ error: "Failed to fetch configuration" }, { status: 500 });
    }
}
