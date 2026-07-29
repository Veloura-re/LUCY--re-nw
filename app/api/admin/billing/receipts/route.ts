import { NextResponse } from 'next/server';
import { verifySuperAdmin } from '@/lib/admin-auth';

export async function GET(request: Request) {
    const dbUser = await verifySuperAdmin();
    if (!dbUser) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        const { prisma: db } = require('@/lib/prisma');
        let receipts = [];

        if (db && db.billingReceipt) {
            receipts = await db.billingReceipt.findMany({
                orderBy: { createdAt: 'desc' },
                include: {
                    school: true,
                    submittedBy: {
                        select: { id: true, name: true, email: true }
                    }
                }
            });
            return NextResponse.json({ receipts });
        }

        // Edge/Supabase fallback
        const { createClient } = require('@supabase/supabase-js');
        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );
        
        const { data, error } = await supabaseAdmin
            .from('BillingReceipt')
            .select('*');

        if (!error && data) {
            receipts = data;
        }

        return NextResponse.json({ receipts });
    } catch (error: any) {
        console.error('[AdminBillingReceipts/GET] Error:', error.message);
        return NextResponse.json({ receipts: [] });
    }
}
