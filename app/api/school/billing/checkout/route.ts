import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/security';
import Stripe from 'stripe';

// Initialize with a dummy key if env var is missing during build time
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_dummy123', {
    apiVersion: '2026-06-24.dahlia' as any,
});

export async function POST(request: Request) {
    try {
        // Enforce that only Owner or Principal can create a checkout session
        const user = await requireRole(['OWNER', 'PRINCIPAL']);
        
        const { prisma: db } = require('@/lib/prisma');

        // Fetch the school to get its name and current Stripe Customer ID if it exists
        let school;
        if (!db) {
            const { createClient } = require('@supabase/supabase-js');
            const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
            const { data } = await supabaseAdmin.from('School').select('*').eq('id', user.schoolId).single();
            school = data;
        } else {
            school = await db.school.findUnique({ where: { id: user.schoolId } });
        }

        if (!school) {
            return NextResponse.json({ error: 'School not found' }, { status: 404 });
        }

        if (!process.env.STRIPE_SECRET_KEY) {
            return NextResponse.json({ error: 'Stripe is not configured on this server.' }, { status: 500 });
        }

        const domain = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

        // Set up the checkout session for a $149/month subscription
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'], // Stripe automatically enables Google Pay and Apple Pay
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
                        unit_amount: 14900, // $149.00 in cents
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

        return NextResponse.json({ 
            success: true, 
            checkoutUrl: session.url
        });
    } catch (error: any) {
        console.error('[BillingCheckout/POST] Error:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
