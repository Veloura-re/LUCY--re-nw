import { NextResponse } from 'next/server';
import { requireRole, handleApiError } from '@/lib/security';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
    try {
        // Enforce that only Owner or Principal can run this simulation
        const user = await requireRole(['OWNER', 'PRINCIPAL']);

        const mockCustomerId = `cus_${Math.random().toString(36).slice(2, 10)}`;
        const mockSubscriptionId = `sub_${Math.random().toString(36).slice(2, 10)}`;
        // Future date for extended billing
        const extendedTrialDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

        // Use top-level prisma import to prevent dynamic require cold-start failures
        await prisma.school.update({
            where: { id: user.schoolId! },
            data: {
                subscriptionStatus: 'active',
                stripeCustomerId: mockCustomerId,
                stripeSubscriptionId: mockSubscriptionId,
                trialEndsAt: extendedTrialDate
            }
        });

        // Non-blocking audit
        try {
            const { logActivity } = await import('@/lib/audit');
            const _ip = request?.headers?.get('x-forwarded-for')?.split(',')[0]?.trim() || request?.headers?.get('cf-connecting-ip') || undefined;
            await logActivity({ userId: user.id, action: 'SIMULATE_SUBSCRIPTION', resourceType: 'billing', ip: _ip });
        } catch { /* non-blocking */ }

        return NextResponse.json({
            success: true,
            message: 'Stripe subscription simulated successfully.',
            subscriptionStatus: 'active'
        });
    } catch (error: any) {
        return handleApiError(error);
    }
}
