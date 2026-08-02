import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/security";

export async function GET(req: Request) {
    try {
        const user = await requireRole(['SUPERADMIN', 'OWNER', 'PRINCIPAL', 'TEACHER', 'HOMEROOM']);
        if (!user?.schoolId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const terms = await prisma.academicTerm.findMany({
            where: { schoolId: user.schoolId },
            orderBy: { startDate: "desc" },
        });

        return NextResponse.json({ terms });
    } catch (error) {
        console.error("Fetch terms error:", error);
        return NextResponse.json({ error: "Failed to fetch terms" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const user = await requireRole(['SUPERADMIN', 'OWNER', 'PRINCIPAL']);
        if (!user?.schoolId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const body = await req.json() as { name: string; startDate: string; endDate: string; isActive: boolean };
        const { name, startDate, endDate, isActive } = body;

        if (!name || !startDate || !endDate) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // If setting this term active, we might want to deactivate others, but let's allow multiple active for now
        // or just set others to inactive if they want strict periods.
        // Actually, let's just create it directly.

        const term = await prisma.academicTerm.create({
            data: {
                schoolId: user.schoolId,
                name,
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                isActive: !!isActive,
            },
        });

        return NextResponse.json({ term });
    } catch (error) {
        console.error("Create term error:", error);
        return NextResponse.json({ error: "Failed to create term" }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        const user = await requireRole(['SUPERADMIN', 'OWNER', 'PRINCIPAL']);
        if (!user?.schoolId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: "Term ID is required" }, { status: 400 });
        }

        const existing = await prisma.academicTerm.findFirst({
            where: { id, schoolId: user.schoolId },
            include: {
                _count: {
                    select: { marklists: true, exams: true }
                }
            }
        });

        if (!existing) {
            return NextResponse.json({ error: "Term not found" }, { status: 404 });
        }

        if (existing._count.marklists > 0 || existing._count.exams > 0) {
            return NextResponse.json({ 
                error: `Cannot delete term "${existing.name}". It is currently linked to ${existing._count.marklists} marklist(s) and ${existing._count.exams} exam(s).` 
            }, { status: 409 });
        }

        await prisma.academicTerm.delete({
            where: { id }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Delete term error:", error);
        return NextResponse.json({ error: "Failed to delete term" }, { status: 500 });
    }
}
