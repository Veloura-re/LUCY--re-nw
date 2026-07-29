import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, handleApiError } from '@/lib/security';
import { Decimal } from "decimal.js";
import { sendInvoiceNotificationEmail } from "@/lib/email";

export async function POST(req: Request) {
    try {
        const dbUser = await requireRole(['OWNER', 'PRINCIPAL', 'SUPERADMIN']);

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
        
        // Group notifications by email to prevent spam
        const notificationGroups = new Map<string, any>();

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

            // Determine targets (parents first, fallback to student email if no parents)
            const targets = student.parentLinks.length > 0 
                ? student.parentLinks.map(l => ({ email: l.parent.email, name: l.parent.name })) 
                : (student.email ? [{ email: student.email, name: studentName }] : []);

            for (const target of targets) {
                if (!target.email) continue;
                
                if (!notificationGroups.has(target.email)) {
                    notificationGroups.set(target.email, {
                        email: target.email,
                        recipientName: target.name,
                        children: [],
                        totalAmount: new Decimal(0),
                        formattedDate,
                        term: term || "Current Term",
                        schoolId: dbUser.schoolId!
                    });
                }
                const group = notificationGroups.get(target.email);
                group.children.push({ name: studentName, amount: totalAmount });
                group.totalAmount = group.totalAmount.plus(totalAmount);
            }
        }

        // Execute transactions in batches of 200 to prevent database locks/timeouts
        const BATCH_SIZE = 200;
        for (let i = 0; i < invoiceOperations.length; i += BATCH_SIZE) {
            const batch = invoiceOperations.slice(i, i + BATCH_SIZE);
            await prisma.$transaction(batch);
            createdCount += batch.length;
        }

        // Process email notifications asynchronously but await them in chunks
        const emailPromises = [];
        const groups = Array.from(notificationGroups.values());

        for (const notif of groups) {
            const studentNames = notif.children.map((c: any) => c.name).join(', ');
            
            // Push the promise (do not await here to allow concurrent sending)
            emailPromises.push(
                sendInvoiceNotificationEmail(
                    notif.email,
                    studentNames,
                    `$${notif.totalAmount.toFixed(2)}`,
                    notif.formattedDate,
                    notif.term,
                    notif.schoolId
                ).catch(err => console.error(`[INVOICE_NOTIFY_ERROR] ${notif.email}:`, err))
            );
        }

        // Await emails in chunks of 50 to prevent connection pool exhaustion
        const EMAIL_BATCH_SIZE = 50;
        for (let i = 0; i < emailPromises.length; i += EMAIL_BATCH_SIZE) {
            const emailBatch = emailPromises.slice(i, i + EMAIL_BATCH_SIZE);
            await Promise.all(emailBatch);
        }
        
        // Audit log (Fixed References)
        try {
            const { logActivity } = await import('@/lib/audit');
            const _ip = req instanceof Request ? (req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || undefined) : undefined;
            const _userId = (typeof dbUser !== 'undefined' && dbUser?.id) ? dbUser.id : undefined;
            if (_userId) {
                await logActivity({ userId: _userId, action: 'GENERATE', resourceType: 'invoice', ip: _ip || undefined });
            }
        } catch { /* non-blocking */ }

        return NextResponse.json({
            success: true,
            message: `Generated ${createdCount} invoices for ${term || 'Current Cycle'}`,
            count: createdCount
        });
    } catch (error) {
        return handleApiError(error);
    }
}
