import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, handleApiError } from "@/lib/security";
import { FeeCategory, FeeFrequency } from "@prisma/client";
import { withAudit } from '@/lib/with-audit';

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

async function handlePOST(req: Request) {
    try {
        const dbUser = await requireRole(['OWNER', 'PRINCIPAL', 'SUPERADMIN']);
        const schoolId = dbUser.schoolId!;

        const body: any = await req.json();
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

        // 2. Automatically sync this new fee into student invoices for immediate parent visibility
        try {
            const studentWhere: any = { schoolId, enrollmentStatus: 'ACTIVE' };
            if (resolvedGradeId) studentWhere.gradeId = resolvedGradeId;

            const targetStudents = await prisma.student.findMany({
                where: studentWhere,
                include: {
                    invoices: {
                        where: { status: 'PENDING' },
                        include: { items: true },
                        orderBy: { createdAt: 'desc' }
                    }
                }
            });

            for (const student of targetStudents) {
                const pendingInv = student.invoices[0];
                if (!pendingInv) {
                    await prisma.invoice.create({
                        data: {
                            studentId: student.id,
                            schoolId,
                            amount: fee.amount,
                            dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                            status: 'PENDING',
                            items: {
                                create: [{
                                    name: fee.name,
                                    amount: fee.amount,
                                    description: `${fee.category} - ${fee.frequency}`,
                                    feeStructureId: fee.id
                                }]
                            }
                        }
                    });
                } else {
                    const alreadyHas = pendingInv.items.some(
                        (it: any) => it.feeStructureId === fee.id || it.name.trim().toLowerCase() === fee.name.trim().toLowerCase()
                    );
                    if (!alreadyHas) {
                        await prisma.invoiceItem.create({
                            data: {
                                invoiceId: pendingInv.id,
                                name: fee.name,
                                amount: fee.amount,
                                description: `${fee.category} - ${fee.frequency}`,
                                feeStructureId: fee.id
                            }
                        });
                        await prisma.invoice.update({
                            where: { id: pendingInv.id },
                            data: {
                                amount: { increment: fee.amount }
                            }
                        });
                    }
                }
            }
        } catch (syncErr) {
            console.error("[Fee Auto-Sync Warning]:", syncErr);
        }

        return NextResponse.json(fee);
    } catch (error) {
        return handleApiError(error);
    }
}

export const POST = withAudit(handlePOST, { action: 'UPDATE_FEE_STRUCTURE', resourceType: 'fee_structure' });
