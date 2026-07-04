import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/security';

export async function POST(request: Request) {
    try {
        const user = await requireRole(['OWNER', 'PRINCIPAL']);
        const body = await request.json() as { amount: number; reference: string; receiptUrl: string; notes?: string };
        const { amount, reference, receiptUrl, notes } = body;

        if (!amount || !reference || !receiptUrl) {
            return NextResponse.json({ error: 'Missing amount, reference or receipt URL' }, { status: 400 });
        }

        const { prisma: db } = require('@/lib/prisma');

        if (!db) {
            // Edge runtime fallback using Supabase
            const { createClient } = require('@supabase/supabase-js');
            const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
            
            const { data, error } = await supabaseAdmin.from('BillingReceipt').insert({
                id: crypto.randomUUID(),
                schoolId: user.schoolId,
                submittedById: user.id,
                amount,
                reference,
                receiptUrl,
                status: 'PENDING',
                notes: notes || '',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            }).select().single();

            if (error) throw error;
        } else {
            // Node runtime using Prisma
            await db.billingReceipt.create({
                data: {
                    schoolId: user.schoolId,
                    submittedById: user.id,
                    amount,
                    reference,
                    receiptUrl,
                    status: 'PENDING',
                    notes: notes || ''
                }
            });
        }

        return NextResponse.json({ 
            success: true, 
            message: 'Manual payment receipt submitted successfully for verification.' 
        });
    } catch (error: any) {
        console.error('[BillingReceipt/POST] Error:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function GET(request: Request) {
    try {
        const user = await requireRole(['OWNER', 'PRINCIPAL']);
        const { prisma: db } = require('@/lib/prisma');

        let receipts = [];
        if (!db) {
            const { createClient } = require('@supabase/supabase-js');
            const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
            
            const { data, error } = await supabaseAdmin
                .from('BillingReceipt')
                .select('*')
                .eq('schoolId', user.schoolId)
                .order('createdAt', { ascending: false });

            if (error) throw error;
            receipts = data || [];
        } else {
            receipts = await db.billingReceipt.findMany({
                where: { schoolId: user.schoolId },
                orderBy: { createdAt: 'desc' }
            });
        }

        return NextResponse.json({ receipts });
    } catch (error: any) {
        console.error('[BillingReceipt/GET] Error:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
