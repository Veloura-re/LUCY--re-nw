import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/security';

export async function POST(request: Request) {
    try {
        // Enforce that only Owner or Principal can run this simulation
        const user = await requireRole(['OWNER', 'PRINCIPAL']);
        
        const { prisma: db } = require('@/lib/prisma');
        const mockCustomerId = `cus_${Math.random().toString(36).slice(2, 10)}`;
        const mockSubscriptionId = `sub_${Math.random().toString(36).slice(2, 10)}`;
        // Future date for extended billing
        const extendedTrialDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

        if (!db) {
            // Edge runtime fallback using Supabase
            const { createClient } = require('@supabase/supabase-js');
            const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
            
            const { error } = await supabaseAdmin.from('School').update({
                subscriptionStatus: 'active',
                stripeCustomerId: mockCustomerId,
                stripeSubscriptionId: mockSubscriptionId,
                trialEndsAt: extendedTrialDate.toISOString()
            }).eq('id', user.schoolId);

            if (error) throw error;
        } else {
            // Node runtime using Prisma
            await db.school.update({
                where: { id: user.schoolId },
                data: {
                    subscriptionStatus: 'active',
                    stripeCustomerId: mockCustomerId,
                    stripeSubscriptionId: mockSubscriptionId,
                    trialEndsAt: extendedTrialDate
                }
            });
        }

        return NextResponse.json({ 
            success: true, 
            message: 'Stripe subscription simulated successfully.',
            subscriptionStatus: 'active'
        });
    } catch (error: any) {
        console.error('[BillingSimulation/POST] Error:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
