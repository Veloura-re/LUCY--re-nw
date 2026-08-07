import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, handleApiError } from "@/lib/security";
import { FeeCategory, FeeFrequency } from "@prisma/client";

const VALID_CATEGORIES: Record<string, FeeCategory> = {
    TUITION: FeeCategory.TUITION,
    TRANSPORT: FeeCategory.TRANSPORT,
    SPORTS: FeeCategory.SPORTS,
    LIBRARY: FeeCategory.LIBRARY,
    LABORATORY: FeeCategory.LABORATORY,
    ACTIVITIES: FeeCategory.ACTIVITIES,
    OTHER: FeeCategory.OTHER,
};

const VALID_FREQUENCIES: Record<string, FeeFrequency> = {
    ONCE: FeeFrequency.ONCE,
    MONTHLY: FeeFrequency.MONTHLY,
    TERM: FeeFrequency.TERM,
    QUARTERLY: FeeFrequency.QUARTERLY,
    SEMESTERLY: FeeFrequency.SEMESTERLY,
    ANNUAL: FeeFrequency.ANNUAL,
};

export async function GET() {
    try {
        const dbUser = await requireRole(['OWNER', 'PRINCIPAL', 'SUPERADMIN']);
        const schoolId = dbUser.schoolId!;

        const fees = await prisma.feeStructure.findMany({
            where: { schoolId },
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
        const dbUser = await requireRole(['OWNER', 'PRINCIPAL', 'SUPERADMIN']);
        const schoolId = dbUser.schoolId!;

        const body = await req.json();
        const { name, amount, category, frequency, gradeId, description } = body;

        if (!name || amount === undefined) {
            return NextResponse.json({ error: "Name and Amount are required fields." }, { status: 400 });
        }

        // Clean & Validate gradeId
        let resolvedGradeId: string | null = null;
        if (gradeId && gradeId !== 'ALL' && gradeId !== 'all' && gradeId.trim() !== '') {
            const gradeExists = await prisma.grade.findFirst({
                where: { id: gradeId, schoolId }
            });
            if (gradeExists) {
                resolvedGradeId = gradeExists.id;
            }
        }

        // Clean & Map Category enum
        const normalizedCategory = String(category || 'TUITION').toUpperCase();
        const finalCategory = VALID_CATEGORIES[normalizedCategory] || FeeCategory.OTHER;

        // Clean & Map Frequency enum
        const normalizedFrequency = String(frequency || 'TERM').toUpperCase();
        const finalFrequency = VALID_FREQUENCIES[normalizedFrequency] || FeeFrequency.TERM;

        const parsedAmount = Math.max(0, parseFloat(String(amount || 0)));

        const fee = await prisma.feeStructure.create({
            data: {
                schoolId,
                gradeId: resolvedGradeId,
                name: String(name).trim(),
                amount: parsedAmount,
                category: finalCategory,
                frequency: finalFrequency,
                description: description ? String(description).trim() : null
            },
            include: {
                grade: true
            }
        });

        return NextResponse.json(fee);
    } catch (error) {
        return handleApiError(error);
    }
}
