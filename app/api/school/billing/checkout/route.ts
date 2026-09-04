import { NextResponse } from 'next/server';
import { requireRole, handleApiError } from '@/lib/security';
import { prisma } from '@/lib/prisma';
import Stripe from 'stripe';

export async function POST(request: Request) {
    try {
        // Enforce that only Owner or Principal can create a checkout session
        const user = await requireRole(['OWNER', 'PRINCIPAL']);

        // 🔮 Crystal Ball: use top-level prisma import — no more dynamic require() cold-start failures
        const school = await prisma.school.findUnique({ where: { id: user.schoolId! } });

        if (!school) {
            return NextResponse.json({ error: 'School not found' }, { status: 404 });
        }

        if (!process.env.STRIPE_SECRET_KEY) {
            return NextResponse.json({ error: 'Stripe is not configured on this server.' }, { status: 500 });
        }

        // Initialize Stripe client securely inside the request handler
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
            apiVersion: '2026-06-24.dahlia' as any,
        });

        const domain = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

        // Set up the checkout session for a $49/month subscription
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            customer_email: user.email,
            client_reference_id: school.id,
            line_items: [
                {
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: 'Enterprise Node Tier (Monthly)',
                            description: `Platform access for ${school.name}`,
                        },
                        unit_amount: 4900, // $49.00 in cents
                        recurring: {
                            interval: 'month',
                        },
                    },
                    quantity: 1,
                },
            ],
            mode: 'subscription',
            success_url: `${domain}/dashboard/billing?session_id={CHECKOUT_SESSION_ID}&success=true`,
            cancel_url: `${domain}/dashboard/billing?canceled=true`,
            metadata: {
                schoolId: school.id,
            }
        });

        // Non-blocking audit
        try {
            const { logActivity } = await import('@/lib/audit');
            const _ip = request?.headers?.get('x-forwarded-for')?.split(',')[0]?.trim() || request?.headers?.get('cf-connecting-ip') || undefined;
            await logActivity({ userId: user.id, action: 'INITIATE_PAYMENT', resourceType: 'billing', ip: _ip });
        } catch { /* non-blocking */ }

        return NextResponse.json({
            success: true,
            checkoutUrl: session.url
        });
    } catch (error: unknown) {
        return handleApiError(error);
    }
}
