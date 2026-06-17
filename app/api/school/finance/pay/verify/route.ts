import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, handleApiError } from "@/lib/security";

export async function POST(req: Request) {
    try {
        const dbUser = await requireRole(['OWNER', 'PRINCIPAL', 'SUPERADMIN', 'TEACHER']);

        const body = await req.json();
        const paymentId = body.paymentId || body.payId;
        const { status, reason } = body; // status = 'SUCCESS' or 'FAILED'

        if (!paymentId || !status) return new NextResponse("Missing parameters", { status: 400 });

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
            const updatedPayment = await tx.payment.update({
                where: { id: paymentId },
                data: {
                    status: status,
                }
            });

            if (status === 'SUCCESS') {
                await tx.invoice.update({
                    where: { id: payment.invoiceId },
                    data: { status: 'PAID' }
                });
            }

            // Log the action
            await tx.auditLog.create({
                data: {
                    userId: dbUser.id,
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
        return handleApiError(error);
    }
}
