import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, handleApiError, FINANCE_ROLES } from "@/lib/security";

export async function POST(req: Request) {
    try {
        const dbUser = await requireRole(FINANCE_ROLES);

        const body: any = await req.json().catch(() => ({}));
        const paymentId = body.paymentId || body.payId;
        const { status, reason } = body; // status = 'SUCCESS' or 'FAILED'

        if (!paymentId || !status) return new NextResponse("Missing parameters", { status: 400 });
        if (status !== 'SUCCESS' && status !== 'FAILED') return new NextResponse("Invalid status", { status: 400 });

        const payment = await prisma.payment.findUnique({
            where: { id: paymentId },
            include: { invoice: true }
        });

        if (!payment) return new NextResponse("Payment not found", { status: 404 });

        // Ensure tenant isolation
        if (payment.invoice.schoolId !== dbUser.schoolId) {
            return new NextResponse("Forbidden", { status: 403 });
        }

        if (payment.status !== 'PENDING') return new NextResponse("Payment already processed", { status: 400 });

        // Atomic Transaction
        const result = await prisma.$transaction(async (tx) => {
            // Claim the pending payment first, so simultaneous confirmations cannot all settle it.
            const claimed = await tx.payment.updateMany({ where: { id: paymentId, status: 'PENDING' }, data: { status } });
            if (claimed.count === 0) throw new Error('payment_already_processed');
            const updatedPayment = await tx.payment.findUniqueOrThrow({ where: { id: paymentId } });

            if (status === 'SUCCESS') {
                await tx.invoice.update({
                    where: { id: payment.invoiceId },
                    data: { status: 'PAID' }
                });
            }

            // Log the action with multi-tenant isolation
            await tx.auditLog.create({
                data: {
                    userId: dbUser.id,
                    schoolId: dbUser.schoolId,
                    action: status === 'SUCCESS' ? "PAYMENT_VERIFIED" : "PAYMENT_REJECTED",
                    resourceType: "PAYMENT",
                    resourceId: paymentId,
                    after: { status, reason }
                } as any
            });

            return updatedPayment;
        });

        return NextResponse.json(result);

    } catch (error: any) {
        if (error?.message === 'payment_already_processed') return new NextResponse("Payment already processed", { status: 400 });
        return handleApiError(error);
    }
}
