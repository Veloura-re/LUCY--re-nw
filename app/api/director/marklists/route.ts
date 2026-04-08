import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/security";

export async function GET(req: Request) {
    try {
        const user = await requireRole(['SUPERADMIN', 'PRINCIPAL']);

        if (!user.schoolId) {
            return NextResponse.json({ error: "Missing school identity" }, { status: 400 });
        }

        const configs = await prisma.marklistConfig.findMany({
            where: {
                schoolId: user.schoolId
            },
            include: {
                class: { select: { name: true } },
                subject: { select: { name: true } },
                _count: {
                    select: { columns: true, entries: true }
                }
            },
            orderBy: {
                updatedAt: 'desc'
            }
        });

        return NextResponse.json({ configs });
    } catch (error) {
        console.error("Fetch Marklists Error:", error);
        return NextResponse.json({ error: "Failed to fetch marklist configurations" }, { status: 500 });
    }
}
