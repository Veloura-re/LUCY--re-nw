import { NextResponse } from 'next/server';
import { requireRole, handleApiError } from '@/lib/security';
import { prisma } from '@/lib/prisma';
import { createSchoolSubscriptionCheckoutSession } from '@/lib/stripe';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {
        // Enforce that only Owner or Principal can create a checkout session
        const user = await requireRole(['OWNER', 'PRINCIPAL']);

        const school = await prisma.school.findUnique({ where: { id: user.schoolId! } });

        if (!school) {
            return NextResponse.json({ error: 'School not found' }, { status: 404 });
        }

        if (!process.env.STRIPE_SECRET_KEY) {
            return NextResponse.json({ error: 'Stripe is not configured on this server.' }, { status: 500 });
        }

        const domain = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

        // Set up the checkout session with dynamic payment methods and customer reuse
        const session = await createSchoolSubscriptionCheckoutSession({
            schoolId: school.id,
            schoolName: school.name,
            userEmail: user.email,
            existingCustomerId: school.stripeCustomerId,
            successUrl: `${domain}/dashboard/billing?session_id={CHECKOUT_SESSION_ID}&success=true`,
            cancelUrl: `${domain}/dashboard/billing?canceled=true`,
            tierName: 'Enterprise Node Tier (Monthly)',
            amountCents: 4900,
        });

        // Non-blocking audit adhering to multi-tenant audit invariant
        try {
            const { logActivity } = await import('@/lib/audit');
            const _ip = request?.headers?.get('x-forwarded-for')?.split(',')[0]?.trim() || request?.headers?.get('cf-connecting-ip') || undefined;
            await logActivity({
                userId: user.id,
                schoolId: user.schoolId!,
                action: 'INITIATE_PAYMENT',
                resourceType: 'billing',
                ip: _ip,
                after: { sessionId: session.id, amountCents: 4900 }
            });
        } catch { /* non-blocking */ }

        return NextResponse.json({
            success: true,
            checkoutUrl: session.url
        });
    } catch (error: any) {
        return handleApiError(error);
    }
}

