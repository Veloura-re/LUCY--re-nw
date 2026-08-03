import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { getCachedUser } from "@/lib/users";
import { prisma } from "@/lib/prisma";
import BillingClientWrapper from "@/components/dashboard/billing-client-wrapper";
import { Suspense } from "react";
import SpringingLoader from "@/components/dashboard/springing-loader";

export const dynamic = 'force-dynamic';

export default async function BillingPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    let dbUser: any = null;
    try {
        dbUser = await getCachedUser(user.id);
    } catch (e) {
        console.error('[BillingPage] User resolution error:', e);
    }

    let school = dbUser?.school || null;
    let receipts: any[] = [];

    if (school?.id) {
        try {
            if (prisma) {
                receipts = await prisma.billingReceipt.findMany({
                    where: { schoolId: school.id },
                    orderBy: { createdAt: 'desc' }
                });
            } else {
                const { createClient: createSupabaseAdmin } = require('@supabase/supabase-js');
                const supabaseAdmin = createSupabaseAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
                const { data } = await supabaseAdmin
                    .from('BillingReceipt')
                    .select('*')
                    .eq('schoolId', school.id)
                    .order('createdAt', { ascending: false });
                receipts = data || [];
            }
        } catch (e) {
            console.error('[BillingPage] Receipt fetch error:', e);
        }
    }

    return (
        <Suspense fallback={<div className="min-h-[60vh] flex items-center justify-center"><SpringingLoader message="Synthesizing Institutional Ledger..." /></div>}>
            <BillingClientWrapper 
                initialSchool={school ? JSON.parse(JSON.stringify(school)) : null}
                initialReceipts={receipts ? JSON.parse(JSON.stringify(receipts)) : []}
                me={dbUser ? JSON.parse(JSON.stringify(dbUser)) : null}
            />
        </Suspense>
    );
}
