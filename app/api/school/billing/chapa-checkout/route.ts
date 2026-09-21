export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { requireRole, handleApiError } from '@/lib/security';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
    try {
        // Enforce that only Owner or Principal can create a checkout session
        const user = await requireRole(['OWNER', 'PRINCIPAL']);

        // Use top-level prisma import to prevent dynamic require cold-start failures
        const school = await prisma.school.findUnique({ where: { id: user.schoolId! } });

        if (!school) {
            return NextResponse.json({ error: 'School not found' }, { status: 404 });
        }

        if (!process.env.CHAPA_SECRET_KEY) {
            return NextResponse.json({ error: 'Chapa is not configured on this server.' }, { status: 500 });
        }

        const domain = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

        // Convert $49 USD to ETB (Approximate rate: 1 USD = ~120 ETB, so roughly 5880 ETB)
        const amountETB = '5880';
        const tx_ref = `tx-${school.id}-${Date.now()}`;

        // Initialize Chapa Transaction
        const response = await fetch('https://api.chapa.co/v1/transaction/initialize', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.CHAPA_SECRET_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                amount: amountETB,
                currency: 'ETB',
                email: user.email,
                first_name: 'School',
                last_name: 'Admin',
                tx_ref: tx_ref,
                callback_url: `${domain}/api/webhooks/chapa`,
                return_url: `${domain}/dashboard/billing?chapa_success=true&tx_ref=${tx_ref}`,
                customization: {
                    title: 'LUCY Platform Subscription',
                    description: `1 Month Platform Access for ${school.name}`,
                    logo: `${domain}/icon.svg`
                }
            })
        });

        const chapaData = await response.json() as any;

        if (chapaData.status === 'success' && chapaData.data?.checkout_url) {
            // Non-blocking audit
            try {
                const { logActivity } = await import('@/lib/audit');
                const _ip = request?.headers?.get('x-forwarded-for')?.split(',')[0]?.trim() || request?.headers?.get('cf-connecting-ip') || undefined;
                await logActivity({ userId: user.id, action: 'INITIATE_PAYMENT', resourceType: 'billing', ip: _ip });
            } catch { /* non-blocking */ }

            return NextResponse.json({ checkoutUrl: chapaData.data.checkout_url });
        } else {
            console.error('[ChapaCheckout] Initialization Error:', chapaData);
            return NextResponse.json({ error: 'Failed to initialize Chapa checkout.' }, { status: 500 });
        }
    } catch (err: any) {
        return handleApiError(err);
    }
}
