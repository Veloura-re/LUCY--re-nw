import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, handleApiError } from '@/lib/security';
import { Decimal } from "decimal.js";
import { sendInvoiceNotificationEmail } from "@/lib/email";

export async function POST(req: Request) {
    try {
        const dbUser = await requireRole(['PRINCIPAL', 'SUPERADMIN']);

        const body = await req.json();
        const { term, dueDate } = body;

        if (!dueDate) {
            return new NextResponse("Missing due date", { status: 400 });
        }

        // 1. Fetch all students in the school
        const students = await prisma.student.findMany({
            where: { schoolId: dbUser.schoolId! },
            include: {
                grade: true,
                parentLinks: { include: { parent: true } }
            }
        });

        // 2. Fetch all active fee structures
        const universalFees = await prisma.feeStructure.findMany({
            where: {
                schoolId: dbUser.schoolId!,
                gradeId: null
            }
        });

        const gradeSpecificFees = await prisma.feeStructure.findMany({
            where: {
                schoolId: dbUser.schoolId!,
                gradeId: { not: null }
            }
        });

        let createdCount = 0;

        // 3. Generate Invoices
        for (const student of students) {
            const relevantGradeFees = gradeSpecificFees.filter(f => f.gradeId === student.gradeId);
            const allRelevantFees = [...universalFees, ...relevantGradeFees];

            if (allRelevantFees.length === 0) continue;

            const totalAmount = allRelevantFees.reduce((sum, fee) => sum.plus(new Decimal(fee.amount.toString())), new Decimal(0));

            // Create Invoice
            const invoice = await prisma.invoice.create({
                data: {
                    studentId: student.id,
                    schoolId: dbUser.schoolId!,
                    amount: totalAmount,
                    dueDate: new Date(dueDate),
                    status: 'PENDING',
                    items: {
                        create: allRelevantFees.map(fee => ({
                            name: fee.name,
                            amount: fee.amount,
                            description: `${fee.category} - ${fee.frequency}`,
                            feeStructureId: fee.id
                        }))
                    }
                }
            });

            // NOTIFICATION LOGIC: Notify parents
            const studentName = `${student.firstName} ${student.lastName}`;
            const formattedDate = new Date(dueDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

            for (const link of student.parentLinks) {
                if (link.parent.email) {
                    sendInvoiceNotificationEmail(
                        link.parent.email,
                        studentName,
                        `$${totalAmount.toFixed(2)}`,
                        formattedDate,
                        term || "Current Term",
                        dbUser.schoolId!
                    ).catch(err => console.error(`[INVOICE_NOTIFY_ERROR] ${student.id}:`, err));
                }
            }

            createdCount++;
        }

        return NextResponse.json({
            success: true,
            message: `Generated ${createdCount} invoices for ${term || 'Current Cycle'}`,
            count: createdCount
        });
    } catch (error) {
        return handleApiError(error);
    }
}
