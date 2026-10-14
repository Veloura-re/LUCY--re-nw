import { prisma } from '@/lib/prisma';

export const DEFAULT_TRIAL_DAYS = 120;
export const DAY_MS = 24 * 60 * 60 * 1000;

type SchoolDates = { trialEndsAt?: Date | string | null; createdAt?: Date | string | null };

/**
 * Epoch milliseconds at which a school's access ends. Mirrors the dashboard layout: an explicit
 * trialEndsAt wins, otherwise the default trial runs from the school's creation date.
 */
export function getAccessEnd(school: SchoolDates | null | undefined): number {
    if (school?.trialEndsAt) return new Date(school.trialEndsAt).getTime();
    if (school?.createdAt) return new Date(school.createdAt).getTime() + DEFAULT_TRIAL_DAYS * DAY_MS;
    return 0;
}

/**
 * One-off purchase of access (bank transfer, Chapa): the bought days are added on top of whatever
 * access remains, so paying early never wastes time.
 */
export function accessEndAfterPurchase(school: SchoolDates | null | undefined, days: number): Date {
    return new Date(Math.max(Date.now(), getAccessEnd(school)) + days * DAY_MS);
}

/**
 * Subscription renewal: access runs `days` from now (a grace window past the billing period) but is
 * never shortened below the current end, so subscribing during a trial cannot cost free days.
 */
export function accessEndAfterRenewal(school: SchoolDates | null | undefined, days: number): Date {
    return new Date(Math.max(getAccessEnd(school), Date.now() + days * DAY_MS));
}

/** Whole days of access left, or 0 when expired. */
export function remainingAccessDays(school: SchoolDates | null | undefined): number {
    return Math.max(0, Math.floor((getAccessEnd(school) - Date.now()) / DAY_MS));
}

type Db = Pick<typeof prisma, 'user'>;

/**
 * AuditLog.userId is a foreign key, so system events (payment webhooks) need a real user to be
 * recorded against. Prefer someone in the school, falling back to a platform administrator.
 */
export async function findBillingActor(schoolId: string, db: Db = prisma): Promise<string | null> {
    for (const role of ['OWNER', 'PRINCIPAL'] as const) {
        const u = await db.user.findFirst({ where: { schoolId, role }, select: { id: true } });
        if (u) return u.id;
    }
    const anyStaff = await db.user.findFirst({ where: { schoolId }, select: { id: true } });
    if (anyStaff) return anyStaff.id;
    const admin = await db.user.findFirst({ where: { role: 'SUPERADMIN' }, select: { id: true } });
    return admin?.id ?? null;
}

/** Records a billing event for a school without needing a signed-in user. Never throws. */
export async function logBillingActivity(params: {
    schoolId: string;
    action: string;
    resourceId?: string;
    after?: unknown;
}) {
    try {
        const userId = await findBillingActor(params.schoolId);
        if (!userId) return;
        await prisma.auditLog.create({
            data: {
                userId,
                schoolId: params.schoolId,
                action: params.action,
                resourceType: 'billing',
                resourceId: params.resourceId,
                after: params.after ? JSON.parse(JSON.stringify(params.after)) : undefined,
            },
        });
    } catch (e) {
        console.error('[billing] Failed to record billing activity:', e);
    }
}
