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
    const body = await request.json() as { status: 'APPROVED' | 'REJECTED'; notes?: string };
    const { status, notes } = body;

    if (!['APPROVED', 'REJECTED'].includes(status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    try {

        if (!prisma) {
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
                const extendedTrialDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
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
            await prisma.$transaction(async (tx: any) => {
                const receipt = await tx.billingReceipt.update({
                    where: { id },
                    data: { 
                        status, 
                        notes: notes || '' 
                    }
                });

                if (status === 'APPROVED') {
                    const extendedTrialDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
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

        
        // Audit log
        try {
            const { logActivity } = await import('@/lib/audit');
            const _ip = request?.headers?.get('x-forwarded-for')?.split(',')[0]?.trim() || request?.headers?.get('cf-connecting-ip') || undefined;
            const _userId = dbUser?.id ?? undefined;
            if (_userId) {
                await logActivity({ userId: _userId, action: 'UPDATE', resourceType: 'billing', ip: _ip || undefined });
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
