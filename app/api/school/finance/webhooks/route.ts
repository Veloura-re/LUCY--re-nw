import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { safeEqual } from "@/lib/security";
import { reportServerError } from '@/lib/error-capture';

// Webhook for payment gateway reconciliation (Stripe, Chapa, Telebirr, CBE Birr)
export async function POST(req: Request) {
    try {
        // Secure webhook endpoint with strict secret verification
        const webhookSecret = process.env.WEBHOOK_SECRET || process.env.LUCY_WEBHOOK_SECRET;
        const incomingSecret = req.headers.get('x-webhook-secret') || req.headers.get('authorization')?.replace('Bearer ', '');

        if (!webhookSecret) {
            return NextResponse.json({ error: "Webhook endpoint not configured" }, { status: 500 });
        }

        if (!incomingSecret || !safeEqual(incomingSecret, webhookSecret)) {
            return NextResponse.json({ error: "Unauthorized webhook signature" }, { status: 401 });
        }

        const body: any = await req.json().catch(() => ({}));
        const { invoiceId, transactionReference, amount, status, method, note } = body;

        if (!invoiceId) {
            return NextResponse.json({ error: "invoiceId is required" }, { status: 400 });
        }

        if (status !== 'SUCCESS') {
            return NextResponse.json({ message: "Ignoring non-success event" });
        }

        const invoice = await prisma.invoice.findUnique({
            where: { id: invoiceId }
        });

        if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
        if (invoice.status === 'PAID') return NextResponse.json({ message: "Already processed" });

        // The amount must be stated by the gateway; it never defaults to the invoice amount.
        const incomingAmount = Number(amount);
        if (!Number.isFinite(incomingAmount) || incomingAmount <= 0) {
            return NextResponse.json({ error: "amount is required" }, { status: 400 });
        }
        if (incomingAmount < Number(invoice.amount)) {
            return NextResponse.json({ error: "Insufficient payment amount" }, { status: 400 });
        }

        const METHODS = ['CASH', 'CARD', 'BANK_TRANSFER', 'MOBILE_MONEY', 'OTHER'];
        const safeMethod = METHODS.includes(method) ? method : 'CARD';
        const reference = typeof transactionReference === 'string' && transactionReference.length > 0
            ? transactionReference.slice(0, 200)
            : null;

        // Idempotency: a replayed event for the same gateway reference must not settle twice.
        if (reference) {
            const duplicate = await prisma.payment.findFirst({ where: { invoiceId: invoice.id, reference } });
            if (duplicate) return NextResponse.json({ message: "Already processed" });
        }

        // Atomic Transaction for Reconciliation
        await prisma.$transaction(async (tx) => {
            // 1. Claim the invoice atomically so concurrent deliveries cannot both settle it
            const claimed = await tx.invoice.updateMany({
                where: { id: invoice.id, status: { not: 'PAID' } },
                data: { status: 'PAID' }
            });
            if (claimed.count === 0) return;

            // 2. Create Payment Record
            await tx.payment.create({
                data: {
                    invoiceId: invoice.id,
                    amount: incomingAmount,
                    method: safeMethod as any,
                    reference: reference || `AUTO_WEBHOOK_${Date.now()}`,
                    status: 'SUCCESS'
                }
            });

            // 3. Log highly sensitive audit event with strict multi-tenant schoolId
            const adminUser = await tx.user.findFirst({
                where: {
                    schoolId: invoice.schoolId,
                    role: { in: ['PRINCIPAL', 'OWNER', 'SUPERADMIN'] }
                },
                select: { id: true }
            });

            // Never attribute a school's audit entry to a user of another school; fall back to a
            // platform administrator, who is not tied to any tenant.
            let auditUserId = adminUser?.id;
            if (!auditUserId) {
                const platformAdmin = await tx.user.findFirst({
                    where: { role: 'SUPERADMIN' },
                    select: { id: true }
                });
                auditUserId = platformAdmin?.id;
            }

            if (auditUserId) {
                await tx.auditLog.create({
                    data: {
                        userId: auditUserId,
                        schoolId: invoice.schoolId,
                        action: "AUTO_PAYMENT_CONFIRMATION",
                        resourceType: "INVOICE",
                        resourceId: invoice.id,
                        after: { status: 'PAID', ref: transactionReference, note }
                    } as any
                });
            }
        });

        return NextResponse.json({ success: true, message: "Invoice reconciled automatically" });

    } catch (error: any) {
        console.error("[PAYMENT_WEBHOOK]", error);
        void reportServerError(error, { type: 'webhook_failure', status: 500, context: { provider: 'invoice-gateway' } });
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
