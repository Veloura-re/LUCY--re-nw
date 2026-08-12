import { NextResponse } from 'next/server';
import { requireRole, requireAuth } from '@/lib/security';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
    try {
        const user = await requireRole(['SUPERADMIN', 'OWNER', 'PRINCIPAL']);
        const body = await request.json() as { amount: number; reference: string; receiptUrl: string; notes?: string };
        const { amount, reference, receiptUrl, notes } = body;

        if (!amount || !reference || !receiptUrl) {
            return NextResponse.json({ error: 'Missing amount, reference or receipt URL' }, { status: 400 });
        }

        const schoolId = user.schoolId || (await prisma?.school.findFirst({ select: { id: true } }))?.id;
        if (!schoolId) {
            return NextResponse.json({ error: 'No school associated with this account.' }, { status: 400 });
        }

        if (!prisma) {
            // Edge runtime fallback using Supabase
            const { createClient } = require('@supabase/supabase-js');
            const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
            
            const { error } = await supabaseAdmin.from('BillingReceipt').insert({
                id: globalThis.crypto.randomUUID(),
                schoolId: schoolId,
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
            await prisma.billingReceipt.create({
                data: {
                    schoolId: schoolId,
                    submittedById: user.id,
                    amount,
                    reference,
                    receiptUrl,
                    status: 'PENDING',
                    notes: notes || ''
                }
            });
        }

        // Audit log
        try {
            const { logActivity } = await import('@/lib/audit');
            const _ip = request?.headers?.get('x-forwarded-for')?.split(',')[0]?.trim() || request?.headers?.get('cf-connecting-ip') || undefined;
            const _userId = user?.id ?? undefined;
            if (_userId) {
                await logActivity({ userId: _userId, action: 'CREATE', resourceType: 'billing', ip: _ip || undefined });
            }
        } catch { /* non-blocking */ }

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
        const authUser = await requireAuth();
        
        let schoolId: string | null = null;
        if (!prisma) {
            const { createClient } = require('@supabase/supabase-js');
            const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
            const { data } = await supabaseAdmin.from('User').select('schoolId, role').eq('id', authUser.id).single();
            schoolId = data?.schoolId || null;
            if (!schoolId && data?.role === 'SUPERADMIN') {
                const { data: firstSchool } = await supabaseAdmin.from('School').select('id').limit(1).maybeSingle();
                schoolId = firstSchool?.id || null;
            }
        } else {
            const dbUser = await prisma.user.findUnique({
                where: { id: authUser.id },
                select: {
                    schoolId: true,
                    role: true,
                    student: { select: { schoolId: true } },
                    parentLinks: { select: { student: { select: { schoolId: true } } } }
                }
            });
            schoolId = dbUser?.schoolId || dbUser?.student?.schoolId || dbUser?.parentLinks?.[0]?.student?.schoolId || null;
            if (!schoolId && (dbUser?.role === 'SUPERADMIN' || !dbUser?.schoolId)) {
                const firstSchool = await prisma.school.findFirst({ select: { id: true }, orderBy: { createdAt: 'asc' } });
                schoolId = firstSchool?.id || null;
            }
        }

        if (!schoolId) {
            return NextResponse.json({ receipts: [] });
        }

        let receipts = [];
        if (!prisma) {
            const { createClient } = require('@supabase/supabase-js');
            const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
            
            const { data, error } = await supabaseAdmin
                .from('BillingReceipt')
                .select('*')
                .eq('schoolId', schoolId)
                .order('createdAt', { ascending: false });

            if (error) throw error;
            receipts = data || [];
        } else {
            receipts = await prisma.billingReceipt.findMany({
                where: { schoolId: schoolId },
                orderBy: { createdAt: 'desc' }
            });
        }

        return NextResponse.json({ receipts });
    } catch (error: any) {
        console.error('[BillingReceipt/GET] Error:', error.message);
        return NextResponse.json({ receipts: [] });
    }
}
