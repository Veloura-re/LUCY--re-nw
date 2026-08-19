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
            receipts = await prisma.billingReceipt.findMany({
                where: { schoolId: school.id },
                orderBy: { createdAt: 'desc' }
            });
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
