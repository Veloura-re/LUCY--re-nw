import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/security';

export async function POST(request: Request) {
    try {
        // Enforce that only Owner or Principal can create a checkout session
        const user = await requireRole(['OWNER', 'PRINCIPAL']);
        const { prisma: db } = require('@/lib/prisma');

        let school;
        if (!db) {
            const { createClient } = require('@supabase/supabase-js');
            const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
            const { data } = await supabaseAdmin.from('School').select('*').eq('id', user.schoolId).single();
            school = data;
        } else {
            school = await db.school.findUnique({ where: { id: user.schoolId } });
        }

        if (!school) {
            return NextResponse.json({ error: 'School not found' }, { status: 404 });
        }

        if (!process.env.CHAPA_SECRET_KEY) {
            return NextResponse.json({ error: 'Chapa is not configured on this server.' }, { status: 500 });
        }

        const domain = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        
        // Convert $149 USD to ETB (Approximate rate: 1 USD = ~120 ETB, so roughly 17880 ETB)
        // In a real app, you might want to fetch a live exchange rate or set a static regional price.
        const amountETB = "17880";
        const tx_ref = `tx-${school.id}-${Date.now()}`;

        // Initialize Chapa Transaction
        const response = await fetch("https://api.chapa.co/v1/transaction/initialize", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${process.env.CHAPA_SECRET_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                amount: amountETB,
                currency: "ETB",
                email: user.email,
                first_name: "School",
                last_name: "Admin",
                tx_ref: tx_ref,
                callback_url: `${domain}/api/webhooks/chapa`,
                return_url: `${domain}/dashboard/billing?chapa_success=true&tx_ref=${tx_ref}`,
                customization: {
                    title: "LUCY Platform Subscription",
                    description: `1 Month Platform Access for ${school.name}`,
                    logo: `${domain}/icon.svg`
                }
            })
        });

        const chapaData = await response.json() as any;

        if (chapaData.status === "success" && chapaData.data?.checkout_url) {
            
        // Audit log
        try {
            const { logActivity } = await import('@/lib/audit');
            const _ip = request instanceof Request ? (request.headers.get('x-forwarded-for') || request.headers.get('cf-connecting-ip') || undefined) : undefined;
            const _userId = (typeof user !== 'undefined' && user?.id) ? user.id : undefined;
            if (_userId) {
                await logActivity({ userId: _userId, action: 'INITIATE_PAYMENT', resourceType: 'billing', ip: _ip || undefined });
            }
        } catch { /* non-blocking */ }
return NextResponse.json({ checkoutUrl: chapaData.data.checkout_url });
        } else {
            console.error("Chapa Initialization Error:", chapaData);
            return NextResponse.json({ error: 'Failed to initialize Chapa checkout.' }, { status: 500 });
        }
    } catch (err: any) {
        console.error('[ChapaCheckout]', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
