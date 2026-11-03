import { NextResponse } from 'next/server';
import { requireRole, handleApiError } from '@/lib/security';
import { prisma } from '@/lib/prisma';
import { SUBSCRIPTION_PRICE_USD, CHAPA_CURRENCY } from '@/lib/chapa';
import { quoteUsdInEtb } from '@/lib/fx';
import { logActivity, getIp } from '@/lib/audit';

/** Chapa checkout is paused while it is rebuilt. The payment webhook stays active for payments already in flight. */
const CHAPA_CHECKOUT_ENABLED = false;
const PAUSED = { error: 'Telebirr / CBE payments are being built. Please pay by card or bank transfer for now.' };

/** Today's price in birr, shown before the owner commits to checkout. */
export async function GET() {
    try {
        await requireRole(['OWNER', 'PRINCIPAL']);
        if (!CHAPA_CHECKOUT_ENABLED) return NextResponse.json(PAUSED, { status: 503 });
        const quote = await quoteUsdInEtb(SUBSCRIPTION_PRICE_USD);
        if (!quote) {
            return NextResponse.json({ error: 'Exchange rate is temporarily unavailable.' }, { status: 503 });
        }
        return NextResponse.json({ usd: SUBSCRIPTION_PRICE_USD, amountEtb: quote.amountEtb });
    } catch (err: any) {
        return handleApiError(err);
    }
}

export async function POST(request: Request) {
    try {
        // Enforce that only Owner or Principal can create a checkout session
        const user = await requireRole(['OWNER', 'PRINCIPAL']);
        if (!CHAPA_CHECKOUT_ENABLED) return NextResponse.json(PAUSED, { status: 503 });

        // Use top-level prisma import to prevent dynamic require cold-start failures
        const school = await prisma.school.findUnique({ where: { id: user.schoolId! } });

        if (!school) {
            return NextResponse.json({ error: 'School not found' }, { status: 404 });
        }

        if (!process.env.CHAPA_SECRET_KEY) {
            return NextResponse.json({ error: 'Chapa is not configured on this server.' }, { status: 500 });
        }

        const domain = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

        // Convert the USD price to ETB at today's rate. The quote is recorded below so the payment can
        // be verified against exactly what this school was asked to pay.
        const quote = await quoteUsdInEtb(SUBSCRIPTION_PRICE_USD);
        if (!quote) {
            return NextResponse.json({ error: 'Exchange rate is temporarily unavailable. Please try again shortly.' }, { status: 503 });
        }
        const amountETB = String(quote.amountEtb);
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
                currency: CHAPA_CURRENCY,
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
            await logActivity({
                userId: user.id,
                schoolId: school.id,
                action: 'CHAPA_CHECKOUT_QUOTED',
                resourceType: 'billing',
                resourceId: tx_ref,
                after: { amountEtb: quote.amountEtb, usd: SUBSCRIPTION_PRICE_USD, rate: quote.rate, rateSource: quote.source, marginPercent: quote.marginPercent },
                ip: getIp(request)
            });

            return NextResponse.json({ checkoutUrl: chapaData.data.checkout_url, amountEtb: quote.amountEtb });
        } else {
            console.error('[ChapaCheckout] Initialization Error:', chapaData);
            return NextResponse.json({ error: 'Failed to initialize Chapa checkout.' }, { status: 500 });
        }
    } catch (err: any) {
        return handleApiError(err);
    }
}
