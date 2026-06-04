import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, handleApiError } from '@/lib/security';
import { Decimal } from "decimal.js";
import { sendInvoiceNotificationEmail } from "@/lib/email";

export async function POST(req: Request) {
    try {
        const dbUser = await requireRole(['PRINCIPAL', 'SUPERADMIN']);

        const body = await req.json() as any;
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
        const invoiceOperations = [];
        const notificationQueue = [];

        for (const student of students) {
            const relevantGradeFees = gradeSpecificFees.filter(f => f.gradeId === student.gradeId);
            const allRelevantFees = [...universalFees, ...relevantGradeFees];

            if (allRelevantFees.length === 0) continue;

            const totalAmount = allRelevantFees.reduce((sum, fee) => sum.plus(new Decimal(fee.amount.toString())), new Decimal(0));

            // Queue Invoice Creation
            invoiceOperations.push(
                prisma.invoice.create({
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
                })
            );

            // Queue Notification
            const studentName = `${student.firstName} ${student.lastName}`;
            const formattedDate = new Date(dueDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

            for (const link of student.parentLinks) {
                if (link.parent.email) {
                    notificationQueue.push({
                        email: link.parent.email,
                        studentName,
                        amount: `$${totalAmount.toFixed(2)}`,
                        formattedDate,
                        term: term || "Current Term",
                        schoolId: dbUser.schoolId!,
                        studentId: student.id
                    });
                }
            }
        }

        // Execute all inserts in a single transaction
        await prisma.$transaction(invoiceOperations);
        createdCount = invoiceOperations.length;

        // Process notifications after successful transaction
        for (const notif of notificationQueue) {
            sendInvoiceNotificationEmail(
                notif.email,
                notif.studentName,
                notif.amount,
                notif.formattedDate,
                notif.term,
                notif.schoolId
            ).catch(err => console.error(`[INVOICE_NOTIFY_ERROR] ${notif.studentId}:`, err));
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
