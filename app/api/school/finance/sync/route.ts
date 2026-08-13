import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, handleApiError } from "@/lib/security";
import { Decimal } from "decimal.js";

export async function POST(req: Request) {
    try {
        const dbUser = await requireRole(['OWNER', 'PRINCIPAL', 'SUPERADMIN']);
        const schoolId = dbUser.schoolId!;

        // 1. Fetch all active fee structures in the school
        const allFees = await prisma.feeStructure.findMany({
            where: { schoolId },
            orderBy: { createdAt: 'desc' }
        });

        if (allFees.length === 0) {
            return NextResponse.json({
                success: false,
                message: "No fee structures found. Please create at least one fee protocol first.",
                syncedCount: 0
            }, { status: 400 });
        }

        // 2. Fetch all active students in the school
        const students = await prisma.student.findMany({
            where: { schoolId, enrollmentStatus: 'ACTIVE' },
            include: {
                invoices: {
                    where: { status: 'PENDING' },
                    include: { items: true },
                    orderBy: { createdAt: 'desc' }
                }
            }
        });

        if (students.length === 0) {
            return NextResponse.json({
                success: false,
                message: "No active students found in this institution to sync fees with.",
                syncedCount: 0
            }, { status: 400 });
        }

        const universalFees = allFees.filter(f => !f.gradeId || f.gradeId === 'ALL' || f.gradeId.trim() === '');
        const gradeSpecificFees = allFees.filter(f => f.gradeId && f.gradeId !== 'ALL' && f.gradeId.trim() !== '');

        let createdInvoicesCount = 0;
        let updatedInvoicesCount = 0;

        for (const student of students) {
            const relevantGradeFees = gradeSpecificFees.filter(f => f.gradeId === student.gradeId);
            const applicableFees = [...universalFees, ...relevantGradeFees];

            if (applicableFees.length === 0) continue;

            const existingPendingInvoice = student.invoices[0];

            if (!existingPendingInvoice) {
                // Create a fresh pending invoice with all applicable fee items
                const totalAmount = applicableFees.reduce(
                    (sum, fee) => sum.plus(new Decimal(fee.amount.toString())),
                    new Decimal(0)
                );

                await prisma.invoice.create({
                    data: {
                        studentId: student.id,
                        schoolId,
                        amount: totalAmount,
                        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                        status: 'PENDING',
                        items: {
                            create: applicableFees.map(fee => ({
                                name: fee.name,
                                amount: fee.amount,
                                description: `${fee.category} - ${fee.frequency}`,
                                feeStructureId: fee.id
                            }))
                        }
                    }
                });
                createdInvoicesCount++;
            } else {
                // Check if any active fees are missing from this existing pending invoice
                const existingFeeIds = new Set(
                    existingPendingInvoice.items.map(it => it.feeStructureId).filter(Boolean)
                );
                const existingNames = new Set(
                    existingPendingInvoice.items.map(it => it.name.trim().toLowerCase())
                );

                const missingFees = applicableFees.filter(
                    fee => !existingFeeIds.has(fee.id) && !existingNames.has(fee.name.trim().toLowerCase())
                );

                if (missingFees.length > 0) {
                    const addedTotal = missingFees.reduce(
                        (sum, fee) => sum.plus(new Decimal(fee.amount.toString())),
                        new Decimal(0)
                    );

                    await prisma.invoiceItem.createMany({
                        data: missingFees.map(fee => ({
                            invoiceId: existingPendingInvoice.id,
                            name: fee.name,
                            amount: fee.amount,
                            description: `${fee.category} - ${fee.frequency}`,
                            feeStructureId: fee.id
                        }))
                    });

                    await prisma.invoice.update({
                        where: { id: existingPendingInvoice.id },
                        data: {
                            amount: new Decimal(existingPendingInvoice.amount.toString()).plus(addedTotal)
                        }
                    });
                    updatedInvoicesCount++;
                }
            }
        }

        return NextResponse.json({
            success: true,
            message: `Successfully synchronized fee architecture with student ledgers. Created ${createdInvoicesCount} invoices, updated ${updatedInvoicesCount}.`,
            createdInvoicesCount,
            updatedInvoicesCount,
            totalStudents: students.length
        });
    } catch (error) {
        return handleApiError(error);
    }
}
