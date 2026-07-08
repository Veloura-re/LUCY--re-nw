import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSchoolLinked, handleApiError } from "@/lib/security";

export async function GET(req: Request) {
    try {
        const dbUser = await requireSchoolLinked();

        const { searchParams } = new URL(req.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '50');
        const skip = (page - 1) * limit;

        const where = { schoolId: dbUser.schoolId };

        const [configs, total] = await Promise.all([
            prisma.marklistConfig.findMany({
                where,
                skip,
                take: limit,
                include: {
                    class: { select: { name: true } },
                    subject: { select: { name: true } },
                    columns: { select: { id: true } }
                },
                orderBy: { updatedAt: 'desc' }
            }),
            prisma.marklistConfig.count({ where })
        ]);

        return NextResponse.json({
            configs,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        return handleApiError(error);
    }
}
