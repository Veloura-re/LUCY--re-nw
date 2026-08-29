import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { prisma } from '@/lib/prisma';

// Initialize with a dummy key if env var is missing during build time


export async function POST(request: Request) {
    try {
        const body = await request.text();
        const signature = request.headers.get('stripe-signature') as string;

        if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
            console.error('Missing STRIPE_WEBHOOK_SECRET or STRIPE_SECRET_KEY');
            return NextResponse.json({ error: 'Stripe configuration missing' }, { status: 500 });
        }

        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
            apiVersion: '2026-06-24.dahlia' as any,
        });

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

                await prisma.school.update({
                    where: { id: schoolId },
                    data: {
                        subscriptionStatus: 'active',
                        stripeCustomerId: customerId,
                        stripeSubscriptionId: subscriptionId,
                        trialEndsAt: extendedTrialDate
                    }
                });
                console.log(`Successfully activated subscription for school ${schoolId}`);
                break;
            }

            case 'invoice.payment_succeeded': {
                const invoice = event.data.object as Stripe.Invoice;
                const customerId = invoice.customer as string;

                // Whenever a recurring payment succeeds, push out the expiration
                const extendedTrialDate = new Date(Date.now() + 35 * 24 * 60 * 60 * 1000); 

                await prisma.school.updateMany({
                    where: { stripeCustomerId: customerId },
                    data: {
                        subscriptionStatus: 'active',
                        trialEndsAt: extendedTrialDate
                    }
                });
                console.log(`Recurring payment successful for customer ${customerId}`);
                break;
            }
            
            case 'customer.subscription.deleted': {
                const subscription = event.data.object as Stripe.Subscription;
                const customerId = subscription.customer as string;

                await prisma.school.updateMany({
                    where: { stripeCustomerId: customerId },
                    data: {
                        subscriptionStatus: 'inactive',
                    }
                });
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
