import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/security";

export async function POST(req: Request) {
    try {
        const user = await requireRole(['SUPERADMIN', 'PRINCIPAL', 'TEACHER', 'HOMEROOM']);
        const body = await req.json() as { classId: string; subjectId: string; teacherId: string; columns: any[]; termId?: string; schoolId?: string };
        const { classId, subjectId, teacherId, columns, termId } = body;

        // Auto-assign schoolId from the authenticated user's session to prevent UI spoofing/errors
        const schoolId = user.schoolId || body.schoolId;

        if (!schoolId || !classId || !subjectId) {
            return NextResponse.json({ error: "Missing required identity fields" }, { status: 400 });
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
                    include: { columns: true }
                });
            } else {
                // Create New
                return await tx.marklistConfig.create({
                    data: {
                        schoolId,
                        classId,
                        subjectId,
                        teacherId,
                        termId: termId || null,
                        columns: {
                            create: columns.map((col: any) => ({
                                title: col.title,
                                maxMarks: col.maxMarks,
                                order: col.order || 0,
                                isOptional: col.isOptional || false
                            }))
                        }
                    },
                    include: { columns: true }
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

        return NextResponse.json(config);
    } catch (error) {
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
        let config;

        if (id) {
            config = await (prisma as any).marklistConfig.findUnique({
                where: { id },
                include: {
                    columns: { orderBy: { order: 'asc' } },
                    class: { select: { name: true } },
                    subject: { select: { name: true } },
                    teacher: { select: { name: true } }
                }
            });
        } else if (classId && subjectId) {
            config = await (prisma as any).marklistConfig.findUnique({
                where: { classId_subjectId: { classId, subjectId } },
                include: {
                    columns: { orderBy: { order: 'asc' } as any },
                    class: { select: { name: true } },
                    subject: { select: { name: true } },
                    teacher: { select: { name: true } }
                }
            });
        } else {
            return NextResponse.json({ error: "Missing identity params" }, { status: 400 });
        }

        if (!config) {
            return NextResponse.json(null);
        }

        return NextResponse.json(config);
    } catch (error) {
        console.error("Fetch Config Error:", error);
        return NextResponse.json({ error: "Failed to fetch configuration" }, { status: 500 });
    }
}
