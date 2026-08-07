import { NextResponse } from 'next/server';
import { verifySuperAdmin } from '@/lib/admin-auth';

export async function GET(request: Request) {
    const dbUser = await verifySuperAdmin();
    if (!dbUser) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        const { prisma: db } = require('@/lib/prisma');
        let receipts: any[] = [];

        if (db && db.billingReceipt) {
            receipts = await db.billingReceipt.findMany({
                orderBy: { createdAt: 'desc' },
                include: {
                    school: {
                        select: { id: true, name: true, schoolCode: true }
                    },
                    submittedBy: {
                        select: { id: true, name: true, email: true }
                    }
                }
            });

            // Backfill any missing school/submittedBy references
            for (let r of receipts) {
                if (!r.school && r.schoolId) {
                    const foundSchool = await db.school.findUnique({
                        where: { id: r.schoolId },
                        select: { id: true, name: true }
                    });
                    if (foundSchool) r.school = foundSchool;
                }
                if (!r.submittedBy && r.submittedById) {
                    const foundUser = await db.user.findUnique({
                        where: { id: r.submittedById },
                        select: { id: true, name: true, email: true }
                    });
                    if (foundUser) r.submittedBy = foundUser;
                }
            }

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
            .select('*, school:School(id, name), submittedBy:User(id, name, email)');

        if (!error && data) {
            receipts = data;
        }

        return NextResponse.json({ receipts });
    } catch (error: any) {
        console.error('[AdminBillingReceipts/GET] Error:', error.message);
        return NextResponse.json({ receipts: [] });
    }
}
