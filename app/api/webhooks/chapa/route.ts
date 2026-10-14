import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { safeEqual } from '@/lib/security';
import { findBillingActor, accessEndAfterPurchase } from '@/lib/billing';
import { parseChapaTxRef, verifyChapaTransaction, CHAPA_MAX_TX_AGE_MS, CHAPA_ACCESS_DAYS, CHAPA_LEGACY_AMOUNT_ETB } from '@/lib/chapa';

export async function POST(request: Request) {
    try {
        const secret = process.env.CHAPA_WEBHOOK_SECRET;
        if (!secret) {
            console.error('Missing CHAPA_WEBHOOK_SECRET');
            return NextResponse.json({ error: 'Webhook secret missing' }, { status: 500 });
        }

        const signature = request.headers.get('chapa-signature');
        const rawBody = await request.text();

        if (!signature) {
            return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
        }

        // Validate the signature using HMAC SHA256
        const hash = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
        
        if (!safeEqual(hash, signature)) {
            return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
        }

        let event: any;
        try {
            event = JSON.parse(rawBody);
        } catch {
            return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
        }

        // Chapa sends successful charge events as "charge.success"
        if (
            event?.event === 'charge.success' &&
            (!event.data?.status || event.data.status === 'success') &&
            typeof event.data?.tx_ref === 'string'
        ) {
            const txRef: string = event.data.tx_ref;
            const parsed = parseChapaTxRef(txRef);

            if (!parsed) {
                console.warn('[Chapa Webhook] Ignoring event with unrecognised tx_ref format');
                return NextResponse.json({ received: true });
            }

            // Ignore stale or future-dated references so an old captured event cannot be replayed
            const age = Date.now() - parsed.createdAt;
            if (age > CHAPA_MAX_TX_AGE_MS || age < -5 * 60 * 1000) {
                console.warn(`[Chapa Webhook] Ignoring out-of-window tx_ref for school ${parsed.schoolId}`);
                return NextResponse.json({ received: true });
            }

            // The amount this school was asked to pay is recorded at checkout. Checkouts created before
            // live pricing have no quote and are held to the previous fixed amount.
            const quoteRecord = await prisma.auditLog.findFirst({
                where: { schoolId: parsed.schoolId, action: 'CHAPA_CHECKOUT_QUOTED', resourceId: txRef },
                select: { after: true }
            });
            const quotedAmount = Number((quoteRecord?.after as { amountEtb?: unknown } | null)?.amountEtb);
            const requiredAmount = Number.isFinite(quotedAmount) && quotedAmount > 0 ? quotedAmount : CHAPA_LEGACY_AMOUNT_ETB;

            // Confirm the payment and amount with Chapa; never trust the webhook body alone
            const verification = await verifyChapaTransaction(txRef, requiredAmount);
            if (!verification.ok) {
                if (verification.reason === 'UNREACHABLE') {
                    // Non-2xx makes Chapa retry the delivery later
                    return NextResponse.json({ error: 'Verification unavailable' }, { status: 503 });
                }
                console.warn(`[Chapa Webhook] Verification rejected (${verification.reason}) for school ${parsed.schoolId}`);
                return NextResponse.json({ received: true });
            }

            const school = await prisma.school.findUnique({
                where: { id: parsed.schoolId },
                select: { id: true, trialEndsAt: true, createdAt: true }
            });
            if (!school) {
                console.warn(`[Chapa Webhook] Verified payment references unknown school ${parsed.schoolId}`);
                return NextResponse.json({ received: true });
            }

            // One payment buys one month of access. The transaction reference is recorded in the
            // audit log, so a redelivered webhook is recognised and does not extend access twice.
            const alreadyProcessed = await prisma.auditLog.findFirst({
                where: { schoolId: school.id, action: 'CHAPA_PAYMENT_CONFIRMED', resourceId: txRef },
                select: { id: true }
            });
            if (alreadyProcessed) {
                return NextResponse.json({ received: true });
            }

            const actorId = await findBillingActor(school.id);
            const newAccessEnd = accessEndAfterPurchase(school, CHAPA_ACCESS_DAYS);

            await prisma.$transaction(async (tx) => {
                await tx.school.update({
                    where: { id: school.id },
                    data: {
                        status: 'ACTIVE',
                        subscriptionStatus: 'active',
                        trialEndsAt: newAccessEnd
                    }
                });

                if (actorId) {
                    await tx.auditLog.create({
                        data: {
                            userId: actorId,
                            schoolId: school.id,
                            action: 'CHAPA_PAYMENT_CONFIRMED',
                            resourceType: 'billing',
                            resourceId: txRef,
                            after: { accessEndsAt: newAccessEnd.toISOString() }
                        }
                    });
                }
            });

            console.log(`[Chapa Webhook] Successfully processed payment for school ${school.id}`);
        }

        return NextResponse.json({ received: true });
    } catch (err: any) {
        console.error('[Chapa Webhook Error]', err);
        return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
    }
}
