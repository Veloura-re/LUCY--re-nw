import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, handleApiError } from '@/lib/security';

export async function POST(req: Request) {
    try {
        const authUser = await requireAuth();

        const body = await req.json();
        const { invoiceId, method = "CARD", reference } = body;

        if (!invoiceId) return new NextResponse("Missing Invoice ID", { status: 400 });

        const dbUser = await prisma.user.findUnique({
            where: { id: authUser.id },
            include: { parentLinks: true }
        });

        if (!dbUser) return new NextResponse("User not found", { status: 404 });

        const invoice = await prisma.invoice.findUnique({
            where: { id: invoiceId },
            include: { student: true }
        });

        if (!invoice) return new NextResponse("Invoice not found", { status: 404 });

        let isAuthorized = false;
        if (dbUser.role === 'PRINCIPAL' || dbUser.role === 'SUPERADMIN' || dbUser.role === 'TEACHER') {
            if (dbUser.schoolId === invoice.schoolId) isAuthorized = true;
        } else if (dbUser.role === 'PARENT') {
            const linked = dbUser.parentLinks.some(link => link.studentId === invoice.studentId);
            if (linked) isAuthorized = true;
        }

        if (!isAuthorized) return new NextResponse("Forbidden", { status: 403 });

        if (invoice.status === 'PAID') {
            return NextResponse.json({ message: "Already Paid" });
        }

        // Check if there's already a pending payment for this invoice
        const existingPending = await prisma.payment.findFirst({
            where: {
                invoiceId: invoice.id,
                status: 'PENDING'
            }
        });

        if (existingPending) {
            return NextResponse.json({ error: "Verification in progress for a previous submission." }, { status: 400 });
        }

        // Determine if this is a manual settlement that needs verification
        const needsVerification = ["BANK_TRANSFER", "CASH", "OTHER"].includes(method);
        const finalStatus = needsVerification ? "PENDING" : "SUCCESS";

        // Transaction
        const result = await prisma.$transaction(async (tx) => {
            const payment = await tx.payment.create({
                data: {
                    invoiceId: invoice.id,
                    amount: invoice.amount,
                    method: method,
                    reference: reference || null,
                    status: finalStatus
                }
            });

            // Only mark invoice as PAID if status is SUCCESS
            if (finalStatus === 'SUCCESS') {
                await tx.invoice.update({
                    where: { id: invoice.id },
                    data: { status: 'PAID' }
                });
            }

            return payment;
        });

        return NextResponse.json({ success: true, payment: result, pending: needsVerification });

    } catch (e) {
        return handleApiError(e);
    }
}
