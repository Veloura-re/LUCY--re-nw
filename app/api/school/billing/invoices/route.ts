import { NextResponse } from 'next/server';
import { requireRole, handleApiError } from '@/lib/security';
import { prisma } from '@/lib/prisma';
import { getStripe, createStudentTuitionInvoice } from '@/lib/stripe';
import { logActivity } from '@/lib/audit';

export async function POST(request: Request) {
    try {
        const user = await requireRole(['OWNER', 'PRINCIPAL', 'SUPERADMIN']);
        const schoolId = user.schoolId!;

        const body = (await request.json()) as any;
        const { recipientEmail, recipientName, description, items, daysUntilDue = 30 } = body;

        if (!recipientEmail || !items || !Array.isArray(items) || items.length === 0) {
            return NextResponse.json(
                { error: 'Missing recipientEmail or valid items array.' },
                { status: 400 }
            );
        }

        // Find or create customer in Stripe
        const existingCustomers = await getStripe().customers.list({
            email: recipientEmail,
            limit: 1,
        });

        let customerId: string;
        if (existingCustomers.data.length > 0) {
            customerId = existingCustomers.data[0].id;
        } else {
            const newCustomer = await getStripe().customers.create({
                email: recipientEmail,
                name: recipientName || recipientEmail,
                metadata: {
                    schoolId,
                },
            });
            customerId = newCustomer.id;
        }

        const invoice = await createStudentTuitionInvoice({
            customerId,
            description: description || `Tuition / Academic Invoice for ${recipientName || recipientEmail}`,
            items: items.map((item: any) => ({
                description: item.description,
                amountCents: Math.round(Number(item.amount) * 100),
                currency: item.currency || 'usd',
            })),
            daysUntilDue,
            metadata: {
                schoolId,
                createdByUserId: user.id,
            },
        });

        try {
            await logActivity({
                userId: user.id,
                schoolId,
                action: 'CREATE_INVOICE',
                resourceType: 'billing',
                after: {
                    invoiceId: invoice.id,
                    recipientEmail,
                    totalCents: invoice.total,
                    status: invoice.status,
                },
            });
        } catch { /* non-blocking */ }

        return NextResponse.json({
            success: true,
            invoice: {
                id: invoice.id,
                status: invoice.status,
                hostedInvoiceUrl: invoice.hosted_invoice_url,
                invoicePdf: invoice.invoice_pdf,
                total: (invoice.total / 100).toFixed(2),
                currency: invoice.currency,
                dueDate: invoice.due_date ? new Date(invoice.due_date * 1000).toISOString() : null,
            },
        });
    } catch (error: any) {
        return handleApiError(error);
    }
}
export const dynamic = 'force-dynamic';
