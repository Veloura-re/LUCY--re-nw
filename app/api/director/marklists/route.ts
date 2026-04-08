import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/security";

export async function GET(req: Request) {
    try {
        const user = await requireRole(['SUPERADMIN', 'PRINCIPAL']);

        if (!user.schoolId) {
            return NextResponse.json({ error: "Missing school identity" }, { status: 400 });
        }

        const { searchParams } = new URL(req.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '12');
        const skip = (page - 1) * limit;

        const [configs, total] = await Promise.all([
            prisma.marklistConfig.findMany({
                where: { schoolId: user.schoolId },
                include: {
                    class: { select: { name: true } },
                    subject: { select: { name: true } },
                    _count: { select: { columns: true, entries: true } }
                },
                orderBy: { updatedAt: 'desc' },
                skip,
                take: limit
            }),
            prisma.marklistConfig.count({ where: { schoolId: user.schoolId } })
        ]);

        const hasMore = (skip + configs.length) < total;

        return NextResponse.json({ configs, hasMore });
    } catch (error) {
        console.error("Fetch Marklists Error:", error);
        return NextResponse.json({ error: "Failed to fetch marklist configurations" }, { status: 500 });
    }
}
