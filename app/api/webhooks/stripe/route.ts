import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { getStripe } from '@/lib/stripe';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/audit';

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
            event = getStripe().webhooks.constructEvent(
                body,
                signature,
                process.env.STRIPE_WEBHOOK_SECRET
            );
        } catch (err: any) {
            console.error(`Webhook signature verification failed: ${err.message}`);
            return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
        }

        switch (event.type) {
            case 'checkout.session.completed':
            case 'checkout.session.async_payment_succeeded': {
                const session = event.data.object as Stripe.Checkout.Session;
                
                // Only fulfill if payment has actually succeeded
                if (session.payment_status !== 'paid' && session.payment_status !== 'no_payment_required') {
                    console.log(`Checkout session ${session.id} not yet paid: ${session.payment_status}`);
                    break;
                }

                const schoolId = session.client_reference_id || session.metadata?.schoolId;
                if (!schoolId) {
                    console.error('No schoolId found in session metadata');
                    break;
                }

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
                        trialEndsAt: extendedTrialDate,
                    },
                });

                // Multi-tenant audit log
                try {
                    await logActivity({
                        userId: 'system-stripe-webhook',
                        schoolId,
                        action: 'SUBSCRIPTION_ACTIVATED',
                        resourceType: 'billing',
                        after: {
                            sessionId: session.id,
                            customerId,
                            subscriptionId,
                            eventType: event.type,
                        },
                    });
                } catch { /* non-blocking */ }

                console.log(`Successfully activated subscription for school ${schoolId}`);
                break;
            }

            case 'invoice.paid':
            case 'invoice.payment_succeeded': {
                const invoice = event.data.object as Stripe.Invoice;
                const customerId = invoice.customer as string;

                if (!customerId) break;

                const schools = await prisma.school.findMany({
                    where: { stripeCustomerId: customerId },
                    select: { id: true },
                });

                const extendedTrialDate = new Date(Date.now() + 35 * 24 * 60 * 60 * 1000);

                for (const school of schools) {
                    await prisma.school.update({
                        where: { id: school.id },
                        data: {
                            subscriptionStatus: 'active',
                            trialEndsAt: extendedTrialDate,
                        },
                    });

                    try {
                        await logActivity({
                            userId: 'system-stripe-webhook',
                            schoolId: school.id,
                            action: 'INVOICE_PAYMENT_SUCCEEDED',
                            resourceType: 'billing',
                            after: {
                                invoiceId: invoice.id,
                                amountPaid: invoice.amount_paid,
                                customerId,
                            },
                        });
                    } catch { /* non-blocking */ }
                }

                console.log(`Recurring payment successful for customer ${customerId}`);
                break;
            }

            case 'invoice.payment_failed': {
                const invoice = event.data.object as Stripe.Invoice;
                const customerId = invoice.customer as string;

                if (!customerId) break;

                const schools = await prisma.school.findMany({
                    where: { stripeCustomerId: customerId },
                    select: { id: true },
                });

                for (const school of schools) {
                    await prisma.school.update({
                        where: { id: school.id },
                        data: {
                            subscriptionStatus: 'past_due',
                        },
                    });

                    try {
                        await logActivity({
                            userId: 'system-stripe-webhook',
                            schoolId: school.id,
                            action: 'INVOICE_PAYMENT_FAILED',
                            resourceType: 'billing',
                            after: {
                                invoiceId: invoice.id,
                                customerId,
                            },
                        });
                    } catch { /* non-blocking */ }
                }
                break;
            }

            case 'customer.subscription.deleted': {
                const subscription = event.data.object as Stripe.Subscription;
                const customerId = subscription.customer as string;

                if (!customerId) break;

                const schools = await prisma.school.findMany({
                    where: { stripeCustomerId: customerId },
                    select: { id: true },
                });

                for (const school of schools) {
                    await prisma.school.update({
                        where: { id: school.id },
                        data: {
                            subscriptionStatus: 'inactive',
                        },
                    });

                    try {
                        await logActivity({
                            userId: 'system-stripe-webhook',
                            schoolId: school.id,
                            action: 'SUBSCRIPTION_CANCELED',
                            resourceType: 'billing',
                            after: {
                                subscriptionId: subscription.id,
                                customerId,
                            },
                        });
                    } catch { /* non-blocking */ }
                }

                console.log(`Subscription deleted for customer ${customerId}`);
                break;
            }

            case 'customer.subscription.updated': {
                const subscription = event.data.object as Stripe.Subscription;
                const customerId = subscription.customer as string;

                if (!customerId) break;

                const status = subscription.status === 'active' ? 'active' :
                               subscription.status === 'past_due' ? 'past_due' : 'inactive';

                await prisma.school.updateMany({
                    where: { stripeCustomerId: customerId },
                    data: { subscriptionStatus: status },
                });
                break;
            }

            default:
                console.log(`Unhandled Stripe event type: ${event.type}`);
        }

        return NextResponse.json({ received: true });
    } catch (error: any) {
        console.error('Stripe webhook handling error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
export const dynamic = 'force-dynamic';
