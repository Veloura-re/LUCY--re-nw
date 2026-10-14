import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/email';
import { isAuthorizedCron, escapeHtml } from '@/lib/security';
import { getAccessEnd, DAY_MS, findBillingActor } from '@/lib/billing';
import { quoteUsdInEtb } from '@/lib/fx';
import { SUBSCRIPTION_PRICE_USD } from '@/lib/chapa';
import { reportServerError } from '@/lib/error-capture';

/** Days before access ends on which a reminder goes out. */
const REMINDER_DAYS = [7, 3, 1];

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://5-cn.net';

function buildEmail(schoolName: string, daysLeft: number, endDate: Date, etbAmount: number | null) {
    const when = daysLeft === 1 ? 'tomorrow' : `in ${daysLeft} days`;
    const price = etbAmount
        ? `About ${etbAmount.toLocaleString('en-US')} ETB through Chapa, or $${SUBSCRIPTION_PRICE_USD} by card`
        : `$${SUBSCRIPTION_PRICE_USD} per month`;
    return {
        subject: `${schoolName}: LUCY access ends ${when}`,
        html: `
            <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #111;">
                <h2 style="margin: 0 0 12px;">Your LUCY access ends ${escapeHtml(when)}</h2>
                <p>Access for <strong>${escapeHtml(schoolName)}</strong> ends on ${escapeHtml(endDate.toUTCString().slice(0, 16))}.
                After that, teachers, parents and students are locked out until the plan is renewed.</p>
                <p><strong>Monthly plan:</strong> ${escapeHtml(price)}.</p>
                <p><a href="${APP_URL}/dashboard/billing" style="display: inline-block; background: #059669; color: #fff; padding: 10px 18px; border-radius: 8px; text-decoration: none;">Renew now</a></p>
                <p style="color: #666; font-size: 12px;">You are receiving this because you are an owner or principal of this school on LUCY.</p>
            </div>`,
    };
}

export async function GET(request: Request) {
    if (!isAuthorizedCron(request)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const schools = await prisma.school.findMany({
            where: { status: 'ACTIVE' },
            select: {
                id: true, name: true, createdAt: true, trialEndsAt: true,
                subscriptionStatus: true, stripeSubscriptionId: true,
            },
        });

        const quote = await quoteUsdInEtb(SUBSCRIPTION_PRICE_USD);
        let sent = 0;
        let skipped = 0;

        for (const school of schools) {
            // Card subscribers renew automatically
            if (school.stripeSubscriptionId && school.subscriptionStatus === 'active') continue;

            const end = getAccessEnd(school);
            const daysLeft = Math.ceil((end - Date.now()) / DAY_MS);
            if (!REMINDER_DAYS.includes(daysLeft)) continue;

            const endDate = new Date(end);
            // One reminder per school, per day-bucket, per access period
            const reminderKey = `${school.id}:${daysLeft}:${endDate.toISOString().slice(0, 10)}`;
            const already = await prisma.auditLog.findFirst({
                where: { schoolId: school.id, action: 'BILLING_REMINDER_SENT', resourceId: reminderKey },
                select: { id: true },
            });
            if (already) { skipped++; continue; }

            const recipients = await prisma.user.findMany({
                where: { schoolId: school.id, role: { in: ['OWNER', 'PRINCIPAL'] }, email: { not: null } },
                select: { email: true },
            });
            if (recipients.length === 0) continue;

            const { subject, html } = buildEmail(school.name, daysLeft, endDate, quote?.amountEtb ?? null);
            let delivered = 0;
            for (const r of recipients) {
                if (!r.email) continue;
                const result = await sendEmail({ to: r.email, subject, html });
                if (result?.success) delivered++;
            }

            if (delivered > 0) {
                sent++;
                const actorId = await findBillingActor(school.id);
                if (actorId) {
                    await prisma.auditLog.create({
                        data: {
                            userId: actorId,
                            schoolId: school.id,
                            action: 'BILLING_REMINDER_SENT',
                            resourceType: 'billing',
                            resourceId: reminderKey,
                            after: { daysLeft, recipients: delivered },
                        },
                    });
                }
            }
        }

        return NextResponse.json({ success: true, checked: schools.length, sent, skipped });
    } catch (error) {
        console.error('[Cron Billing Reminders] Failed:', error);
        void reportServerError(error, { type: 'cron_failure', status: 500, context: { job: 'billing-reminders' } });
        return NextResponse.json({ error: 'Cron failed' }, { status: 500 });
    }
}
