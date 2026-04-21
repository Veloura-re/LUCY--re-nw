import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSchoolLinked, handleApiError } from "@/lib/security";

export async function GET(req: Request) {
    try {
        const dbUser = await requireSchoolLinked();

        // Fetch Configs
        const configs = await prisma.marklistConfig.findMany({
            where: {
                schoolId: dbUser.schoolId,
                // Optional: filter by teacherId if role is TEACHER?
                // For now, list all. Teacher might want to see others or just theirs. 
                // Director wants to see all.
            },
            include: {
                class: { select: { name: true } },
                subject: { select: { name: true } },
                columns: { select: { id: true } } // just count
            },
            orderBy: { updatedAt: 'desc' }
        });

        return NextResponse.json(configs);
    } catch (error) {
        return handleApiError(error);
    }
}
