import { NextResponse } from 'next/server';
import { verifySuperAdmin } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const dbUser = await verifySuperAdmin();
    if (!dbUser) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body = (await request.json().catch(() => ({}))) as { status: 'APPROVED' | 'REJECTED'; notes?: string };
    const { status, notes } = body;

    if (!['APPROVED', 'REJECTED'].includes(status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    try {
        let schoolId: string | null = null;
        await prisma.$transaction(async (tx: any) => {
            const receipt = await tx.billingReceipt.update({
                where: { id },
                data: { 
                    status, 
                    notes: notes || '' 
                }
            });
            schoolId = receipt.schoolId;

            if (status === 'APPROVED') {
                const school = await tx.school.findUnique({
                    where: { id: receipt.schoolId },
                    select: { trialEndsAt: true, createdAt: true }
                });

                const currentExpiry = school?.trialEndsAt 
                    ? new Date(school.trialEndsAt).getTime()
                    : (school?.createdAt ? new Date(school.createdAt).getTime() + 120 * 24 * 60 * 60 * 1000 : 0);

                const baseTime = Math.max(Date.now(), currentExpiry);
                const extendedTrialDate = new Date(baseTime + 30 * 24 * 60 * 60 * 1000); // Add +30 days on top of remaining balance

                await tx.school.update({
                    where: { id: receipt.schoolId },
                    data: {
                        subscriptionStatus: 'active',
                        trialEndsAt: extendedTrialDate
                    }
                });
            }
        });

        // Audit log
        try {
            const { logActivity } = await import('@/lib/audit');
            const _ip = request?.headers?.get('x-forwarded-for')?.split(',')[0]?.trim() || request?.headers?.get('cf-connecting-ip') || undefined;
            if (dbUser?.id) {
                await logActivity({ userId: dbUser.id, schoolId: schoolId || undefined, action: 'UPDATE_BILLING_RECEIPT', resourceType: 'billing', ip: _ip || undefined });
            }
        } catch { /* non-blocking */ }

        return NextResponse.json({ 
            success: true, 
            message: `Receipt status set to ${status}.` 
        });
    } catch (error: any) {
        console.error('[AdminBillingReceipts/PATCH] Error:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
