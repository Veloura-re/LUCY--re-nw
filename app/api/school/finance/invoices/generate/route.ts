import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, handleApiError, FINANCE_ROLES } from '@/lib/security';
import { Decimal } from "decimal.js";
import { sendInvoiceNotificationEmail } from "@/lib/email";
import { withAudit } from '@/lib/with-audit';

async function handlePOST(req: Request) {
    try {
        const dbUser = await requireRole(FINANCE_ROLES);
        const schoolId = dbUser.schoolId!;

        const body = await req.json().catch(() => ({})) as any;
        const { term, dueDate, classId, gradeId, feeStructureIds, defaultAmount } = body;

        const targetDueDate = dueDate ? new Date(dueDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

        // 1. Fetch target students in the school
        const studentWhere: any = { schoolId, enrollmentStatus: 'ACTIVE' };
        if (classId && classId !== 'ALL') studentWhere.classId = classId;
        if (gradeId && gradeId !== 'ALL') studentWhere.gradeId = gradeId;

        const students = await prisma.student.findMany({
            where: studentWhere,
            include: {
                grade: true,
                class: true,
                parentLinks: { include: { parent: true } }
            }
        });

        if (students.length === 0) {
            return NextResponse.json({
                success: false,
                message: "No active students found matching the selected criteria.",
                count: 0
            }, { status: 400 });
        }

        // 2. Fetch all active fee structures
        const allFees = await prisma.feeStructure.findMany({
            where: { schoolId }
        });

        const universalFees = allFees.filter(f => !f.gradeId || f.gradeId === 'ALL' || f.gradeId.trim() === '');
        const gradeSpecificFees = allFees.filter(f => f.gradeId && f.gradeId !== 'ALL' && f.gradeId.trim() !== '');

        let createdCount = 0;
        const notificationGroups = new Map<string, any>();
        const invoiceOperations = [];

        for (const student of students) {
            const effectiveGradeId = student.gradeId || student.class?.gradeId;
            const relevantGradeFees = gradeSpecificFees.filter(f => f.gradeId === effectiveGradeId);
            
            let allRelevantFees = [...universalFees, ...relevantGradeFees];

            // If specific fee structures requested
            if (Array.isArray(feeStructureIds) && feeStructureIds.length > 0) {
                allRelevantFees = allFees.filter(f => feeStructureIds.includes(f.id));
            }

            // Fallback fee if school hasn't configured any fee structure yet
            if (allRelevantFees.length === 0) {
                const fallbackAmount = Number(defaultAmount || 250);
                allRelevantFees = [{
                    id: 'default-tuition',
                    name: `${term || 'Academic'} Tuition & Facilities Fee`,
                    amount: new Decimal(fallbackAmount),
                    category: 'TUITION',
                    frequency: 'TERM'
                } as any];
            }

            const totalAmount = allRelevantFees.reduce((sum, fee) => sum.plus(new Decimal(fee.amount.toString())), new Decimal(0));

            // Queue Invoice Creation
            invoiceOperations.push(
                prisma.invoice.create({
                    data: {
                        studentId: student.id,
                        schoolId,
                        amount: totalAmount,
                        dueDate: targetDueDate,
                        status: 'PENDING',
                        items: {
                            create: allRelevantFees.map(fee => ({
                                name: fee.name,
                                amount: fee.amount,
                                description: `${fee.category || 'TUITION'} - ${fee.frequency || 'TERM'}`,
                                feeStructureId: fee.id.startsWith('default') ? null : fee.id
                            }))
                        }
                    }
                })
            );

            // Queue Notification
            const studentName = `${student.firstName} ${student.lastName}`;
            const formattedDate = targetDueDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

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
                        schoolId
                    });
                }
                const group = notificationGroups.get(target.email);
                group.children.push({ name: studentName, amount: totalAmount });
                group.totalAmount = group.totalAmount.plus(totalAmount);
            }
        }

        // Execute transactions in batches of 100
        const BATCH_SIZE = 100;
        for (let i = 0; i < invoiceOperations.length; i += BATCH_SIZE) {
            const batch = invoiceOperations.slice(i, i + BATCH_SIZE);
            await prisma.$transaction(batch);
            createdCount += batch.length;
        }

        // Process email notifications asynchronously
        const emailPromises = [];
        const groups = Array.from(notificationGroups.values());

        for (const notif of groups) {
            const studentNames = notif.children.map((c: any) => c.name).join(', ');
            
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

        // Await emails in chunks
        const EMAIL_BATCH_SIZE = 25;
        for (let i = 0; i < emailPromises.length; i += EMAIL_BATCH_SIZE) {
            const emailBatch = emailPromises.slice(i, i + EMAIL_BATCH_SIZE);
            await Promise.all(emailBatch);
        }
        
        return NextResponse.json({
            success: true,
            message: `Generated and dispatched ${createdCount} invoices to parents for ${term || 'Current Cycle'}`,
            count: createdCount,
            notifiedParents: groups.length
        });
    } catch (error) {
        return handleApiError(error);
    }
}

export const POST = withAudit(handlePOST, { action: 'GENERATE_INVOICES', resourceType: 'invoice' });
