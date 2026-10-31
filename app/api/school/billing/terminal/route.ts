import { NextResponse } from 'next/server';
import { requireRole, handleApiError, FINANCE_ROLES } from '@/lib/security';
import { createTerminalConnectionToken, createTerminalPaymentIntent } from '@/lib/stripe';
import { logActivity } from '@/lib/audit';

export async function POST(request: Request) {
    try {
        const user = await requireRole([...FINANCE_ROLES, 'TEACHER']);
        const schoolId = user.schoolId!;

        const body = (await request.json().catch(() => ({}))) as any;
        const { action = 'connection_token', amount = 10, currency = 'usd', description = 'Campus POS Transaction' } = body;

        if (action === 'connection_token') {
            const token = await createTerminalConnectionToken();
            return NextResponse.json({
                success: true,
                secret: token.secret,
            });
        }

        if (action === 'create_payment_intent') {
            const amountCents = Math.round(Number(amount) * 100);
            const paymentIntent = await createTerminalPaymentIntent(amountCents, currency, {
                schoolId,
                createdByUserId: user.id,
                description,
            });

            try {
                await logActivity({
                    userId: user.id,
                    schoolId,
                    action: 'CREATE_TERMINAL_PAYMENT_INTENT',
                    resourceType: 'billing',
                    after: {
                        paymentIntentId: paymentIntent.id,
                        amountCents,
                        currency,
                    },
                });
            } catch { /* non-blocking */ }

            return NextResponse.json({
                success: true,
                paymentIntent: {
                    id: paymentIntent.id,
                    clientSecret: paymentIntent.client_secret,
                    amount: (paymentIntent.amount / 100).toFixed(2),
                    currency: paymentIntent.currency,
                    status: paymentIntent.status,
                },
            });
        }

        return NextResponse.json({ error: 'Invalid terminal action' }, { status: 400 });
    } catch (error: any) {
        return handleApiError(error);
    }
}
