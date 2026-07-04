import { NextResponse } from 'next/server';
import { verifySuperAdmin } from '@/lib/admin-auth';

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const dbUser = await verifySuperAdmin();
    if (!dbUser) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json() as { status: 'APPROVED' | 'REJECTED'; notes?: string };
    const { status, notes } = body;

    if (!['APPROVED', 'REJECTED'].includes(status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    try {
        const { prisma: db } = require('@/lib/prisma');

        if (!db) {
            // Edge runtime fallback using Supabase
            const { createClient } = require('@supabase/supabase-js');
            const supabaseAdmin = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.SUPABASE_SERVICE_ROLE_KEY!
            );
            
            // 1. Fetch receipt to find schoolId
            const { data: receipt, error: fetchErr } = await supabaseAdmin
                .from('BillingReceipt')
                .select('schoolId')
                .eq('id', id)
                .maybeSingle();

            if (fetchErr || !receipt) throw fetchErr || new Error('Receipt not found');

            // 2. Update receipt status
            const { error: updateReceiptErr } = await supabaseAdmin
                .from('BillingReceipt')
                .update({ 
                    status, 
                    notes: notes || '',
                    updatedAt: new Date().toISOString()
                })
                .eq('id', id);

            if (updateReceiptErr) throw updateReceiptErr;

            // 3. If approved, activate subscription and extend trial
            if (status === 'APPROVED') {
                const extendedTrialDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year
                const { error: updateSchoolErr } = await supabaseAdmin
                    .from('School')
                    .update({
                        subscriptionStatus: 'active',
                        trialEndsAt: extendedTrialDate.toISOString()
                    })
                    .eq('id', receipt.schoolId);

                if (updateSchoolErr) throw updateSchoolErr;
            }
        } else {
            // Node runtime using Prisma
            await db.$transaction(async (tx: any) => {
                const receipt = await tx.billingReceipt.update({
                    where: { id },
                    data: { 
                        status, 
                        notes: notes || '' 
                    }
                });

                if (status === 'APPROVED') {
                    const extendedTrialDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year
                    await tx.school.update({
                        where: { id: receipt.schoolId },
                        data: {
                            subscriptionStatus: 'active',
                            trialEndsAt: extendedTrialDate
                        }
                    });
                }
            });
        }

        return NextResponse.json({ 
            success: true, 
            message: `Receipt status set to ${status}.` 
        });
    } catch (error: any) {
        console.error('[AdminBillingReceipts/PATCH] Error:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
