import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, handleApiError, clampLimit, clampPage, clientDataError } from "@/lib/security";

export async function GET(req: Request) {
    try {
        const user = await requireRole(['SUPERADMIN', 'OWNER', 'PRINCIPAL']);

        if (!user.schoolId) {
            return NextResponse.json({ error: "Missing school identity" }, { status: 400 });
        }

        const { searchParams } = new URL(req.url);
        const page = clampPage(searchParams.get('page'));
        const limit = clampLimit(searchParams.get('limit'), 12);
        const skip = (page - 1) * limit;

        const configs = await prisma.marklistConfig.findMany({
            where: { schoolId: user.schoolId },
            include: {
                class: { select: { id: true, name: true } },
                subject: { select: { id: true, name: true } },
                teacher: { select: { id: true, name: true } },
                term: {
                    select: {
                        id: true,
                        name: true,
                        isActive: true,
                        startDate: true,
                        endDate: true
                    }
                },
                _count: { select: { columns: true, entries: true } }
            },
            orderBy: { updatedAt: 'desc' },
            skip,
            take: limit
        });

        const total = await prisma.marklistConfig.count({ where: { schoolId: user.schoolId } });

        const hasMore = (skip + configs.length) < total;

        return NextResponse.json({ configs, hasMore });
    } catch (error) {
        { const bad = clientDataError(error); if (bad) return bad; }
        if (/^(Unauthorized|Forbidden)/.test(String((error as any)?.message))) return handleApiError(error);
        console.error("Fetch Marklists Error:", error);
        return NextResponse.json({ error: "Failed to fetch marklist configurations" }, { status: 500 });
    }
}

