import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/security";

// GET: Fetch Grid Data (Entries + Marks)
export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const configId = searchParams.get("configId");

    if (!configId) {
        return NextResponse.json({ error: "Missing configId" }, { status: 400 });
    }

    try {
        await requireRole(['SUPERADMIN', 'PRINCIPAL', 'TEACHER', 'HOMEROOM']);

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
        console.error("Fetch Entries Error:", error);
        return NextResponse.json({ error: "Failed to fetch entries" }, { status: 500 });
    }
}

// POST: Save Marks (Bulk Update)
export async function POST(req: Request) {
    try {
        const user = await requireRole(['SUPERADMIN', 'PRINCIPAL', 'TEACHER', 'HOMEROOM']);
        const body = (await req.json()) as any;
        const { configId, updates } = body;

        if (!configId) {
            return NextResponse.json({ error: "Configuration ID Missing" }, { status: 400 });
        }

        if (!updates || !Array.isArray(updates) || updates.length === 0) {
            return NextResponse.json({ error: "No changes detected to commit" }, { status: 400 });
        }

        await (prisma as any).$transaction(async (tx: any) => {
            const config = await tx.marklistConfig.findUnique({
                where: { id: configId },
                include: { columns: true }
            });

            if (!config) throw new Error("Config not found");

            // Teacher/Homeroom verification
            if (['TEACHER', 'HOMEROOM'].includes(user.role)) {
                const assignment = await tx.teacherAssignment.findFirst({
                    where: {
                        teacherId: user.id,
                        classId: config.classId,
                        subjectId: config.subjectId
                    }
                });
                if (!assignment && config.teacherId !== user.id) {
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

                // Recalculate Totals for this entry using the LATEST data from the update payload + existing marks if needed
                // Actually, for consistency, we fetch the updated entry with its marks.
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

        
        // Audit log
        try {
            const { logActivity } = await import('@/lib/audit');
            const _ip = request instanceof Request ? (request.headers.get('x-forwarded-for') || request.headers.get('cf-connecting-ip') || undefined) : undefined;
            const _userId = (typeof user !== 'undefined' && user?.id) ? user.id : undefined;
            if (_userId) {
                await logActivity({ userId: _userId, action: 'CREATE', resourceType: 'marklist', ip: _ip || undefined });
            }
        } catch { /* non-blocking */ }
return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Save Marks Error:", error);
        if (error.message === "unauthorized_teacher") {
            return NextResponse.json({ error: "You are not authorized to edit this marklist." }, { status: 403 });
        }
        return NextResponse.json({ error: error.message || "Failed to save marks" }, { status: 500 });
    }
}
