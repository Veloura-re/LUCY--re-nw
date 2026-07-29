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
