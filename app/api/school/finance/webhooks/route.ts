import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// This simulates a public webhook from a payment gateway (Stripe, M-Pesa, etc.)
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { invoiceId, transactionReference, amount, status } = body;

        // In a real scenario, you'd verify the webhook signature here

        if (status !== 'SUCCESS') {
            return NextResponse.json({ message: "Ignoring non-success event" });
        }

        const { prisma } = require('@/lib/prisma');
        if (!prisma) {
            const { createClient: createSupabaseAdmin } = require('@supabase/supabase-js');
            const supabaseAdmin = createSupabaseAdmin(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.SUPABASE_SERVICE_ROLE_KEY!
            );

            const { data: invoice } = await supabaseAdmin
                .from('Invoice')
                .select('*')
                .eq('id', invoiceId)
                .maybeSingle();

            if (!invoice) return new NextResponse("Invoice not found", { status: 404 });
            if (invoice.status === 'PAID') return NextResponse.json({ message: "Already processed" });

            // 1. Create Payment Record
            await supabaseAdmin.from('Payment').insert({
                invoiceId: invoice.id,
                amount: invoice.amount,
                method: 'CARD', // Or dynamic based on provider
                reference: transactionReference || "AUTO_WEBHOOK",
                status: 'SUCCESS'
            });

            // 2. Update Invoice Status
            await supabaseAdmin.from('Invoice').update({ status: 'PAID' }).eq('id', invoice.id);

            // 3. (Optional) Log highly sensitive audit event
            await supabaseAdmin.from('AuditLog').insert({
                userId: "SYSTEM", // System triggered
                action: "AUTO_PAYMENT_CONFIRMATION",
                resourceType: "INVOICE",
                resourceId: invoice.id,
                after: { status: 'PAID', ref: transactionReference }
            });

            return NextResponse.json({ success: true, message: "Invoice reconciled automatically" });
        }

        const invoice = await prisma.invoice.findUnique({
            where: { id: invoiceId }
        });

        if (!invoice) return new NextResponse("Invoice not found", { status: 404 });
        if (invoice.status === 'PAID') return NextResponse.json({ message: "Already processed" });

        // Atomic Transaction for Reconciliation
        await prisma.$transaction(async (tx) => {
            // 1. Create Payment Record
            await tx.payment.create({
                data: {
                    invoiceId: invoice.id,
                    amount: invoice.amount,
                    method: 'CARD', // Or dynamic based on provider
                    reference: transactionReference || "AUTO_WEBHOOK",
                    status: 'SUCCESS'
                }
            });

            // 2. Update Invoice Status
            await tx.invoice.update({
                where: { id: invoice.id },
                data: { status: 'PAID' }
            });

            // 3. (Optional) Log highly sensitive audit event
            await tx.auditLog.create({
                data: {
                    userId: "SYSTEM", // System triggered
                    action: "AUTO_PAYMENT_CONFIRMATION",
                    resourceType: "INVOICE",
                    resourceId: invoice.id,
                    after: { status: 'PAID', ref: transactionReference }
                } as any
            });
        });

        return NextResponse.json({ success: true, message: "Invoice reconciled automatically" });

    } catch (error: any) {
        console.error("[PAYMENT_WEBHOOK]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
