import { NextResponse } from 'next/server';
import Stripe from 'stripe';

// Initialize with a dummy key if env var is missing during build time
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_dummy123', {
    apiVersion: '2026-06-24.dahlia' as any,
});

export async function POST(request: Request) {
    try {
        const body = await request.text();
        const signature = request.headers.get('stripe-signature') as string;

        if (!process.env.STRIPE_WEBHOOK_SECRET) {
            console.error('Missing STRIPE_WEBHOOK_SECRET');
            return NextResponse.json({ error: 'Webhook secret missing' }, { status: 500 });
        }

        let event: Stripe.Event;

        try {
            event = stripe.webhooks.constructEvent(
                body,
                signature,
                process.env.STRIPE_WEBHOOK_SECRET
            );
        } catch (err: any) {
            console.error(`Webhook signature verification failed: ${err.message}`);
            return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
        }

        const { prisma: db } = require('@/lib/prisma');

        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object as Stripe.Checkout.Session;
                const schoolId = session.client_reference_id || session.metadata?.schoolId;

                if (!schoolId) {
                    console.error('No schoolId found in session metadata');
                    break;
                }

                // Subscribed via checkout!
                const customerId = session.customer as string;
                const subscriptionId = session.subscription as string;

                // Grant 35 days (1 month + grace) to avoid race conditions with next billing cycle
                const extendedTrialDate = new Date(Date.now() + 35 * 24 * 60 * 60 * 1000); 

                if (!db) {
                    const { createClient } = require('@supabase/supabase-js');
                    const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
                    
                    await supabaseAdmin.from('School').update({
                        subscriptionStatus: 'active',
                        stripeCustomerId: customerId,
                        stripeSubscriptionId: subscriptionId,
                        trialEndsAt: extendedTrialDate.toISOString()
                    }).eq('id', schoolId);
                } else {
                    await db.school.update({
                        where: { id: schoolId },
                        data: {
                            subscriptionStatus: 'active',
                            stripeCustomerId: customerId,
                            stripeSubscriptionId: subscriptionId,
                            trialEndsAt: extendedTrialDate
                        }
                    });
                }
                console.log(`Successfully activated subscription for school ${schoolId}`);
                break;
            }

            case 'invoice.payment_succeeded': {
                const invoice = event.data.object as Stripe.Invoice;
                const customerId = invoice.customer as string;

                // Whenever a recurring payment succeeds, push out the expiration
                const extendedTrialDate = new Date(Date.now() + 35 * 24 * 60 * 60 * 1000); 

                if (!db) {
                    const { createClient } = require('@supabase/supabase-js');
                    const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
                    
                    await supabaseAdmin.from('School').update({
                        subscriptionStatus: 'active',
                        trialEndsAt: extendedTrialDate.toISOString()
                    }).eq('stripeCustomerId', customerId);
                } else {
                    await db.school.updateMany({
                        where: { stripeCustomerId: customerId },
                        data: {
                            subscriptionStatus: 'active',
                            trialEndsAt: extendedTrialDate
                        }
                    });
                }
                console.log(`Recurring payment successful for customer ${customerId}`);
                break;
            }
            
            case 'customer.subscription.deleted': {
                const subscription = event.data.object as Stripe.Subscription;
                const customerId = subscription.customer as string;

                if (!db) {
                    const { createClient } = require('@supabase/supabase-js');
                    const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
                    
                    await supabaseAdmin.from('School').update({
                        subscriptionStatus: 'inactive',
                    }).eq('stripeCustomerId', customerId);
                } else {
                    await db.school.updateMany({
                        where: { stripeCustomerId: customerId },
                        data: {
                            subscriptionStatus: 'inactive',
                        }
                    });
                }
                console.log(`Subscription deleted for customer ${customerId}`);
                break;
            }

            default:
                console.log(`Unhandled event type: ${event.type}`);
        }

        return NextResponse.json({ received: true });
    } catch (err: any) {
        console.error('[StripeWebhook] Fatal Error:', err.message);
        return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
    }
}
