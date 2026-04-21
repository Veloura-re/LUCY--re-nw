import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, handleApiError } from "@/lib/security";

export async function GET() {
    try {
        const dbUser = await requireRole(['PRINCIPAL', 'SUPERADMIN']);

        const fees = await prisma.feeStructure.findMany({
            where: { schoolId: dbUser.schoolId! },
            include: { grade: true },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json(fees);
    } catch (error) {
        return handleApiError(error);
    }
}

export async function POST(req: Request) {
    try {
        const dbUser = await requireRole(['PRINCIPAL', 'SUPERADMIN']);

        const body = await req.json();
        const { name, amount, category, frequency, gradeId, description } = body;

        if (!name || amount === undefined || !category || !frequency) {
            return new NextResponse("Missing required fields", { status: 400 });
        }

        const fee = await prisma.feeStructure.create({
            data: {
                schoolId: dbUser.schoolId!,
                gradeId,
                name,
                amount: parseFloat(amount),
                category,
                frequency,
                description
            }
        });

        return NextResponse.json(fee);
    } catch (error) {
        return handleApiError(error);
    }
}
