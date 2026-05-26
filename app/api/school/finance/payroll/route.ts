import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/utils/supabase/server";

export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { prisma } = require('@/lib/prisma');
        if (!prisma) {
            const { createClient: createSupabaseAdmin } = require('@supabase/supabase-js');
            const supabaseAdmin = createSupabaseAdmin(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.SUPABASE_SERVICE_ROLE_KEY!
            );
            const { data: paychecks, error } = await supabaseAdmin
                .from('StaffPayroll')
                .select('*')
                .eq('userId', user.id)
                .order('createdAt', { ascending: false });
            if (error) throw error;
            return NextResponse.json({ paychecks });
        }

        const paychecks = await (prisma as any).staffPayroll.findMany({
            where: { userId: user.id },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json({ paychecks });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
