import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    const results: Record<string, any> = {};

    // 1. Check Supabase auth
    try {
        const supabase = await createClient();
        const { data: { user }, error } = await supabase.auth.getUser();
        results.supabase_auth = {
            ok: !error,
            user_id: user?.id ?? null,
            error: error?.message ?? null,
        };
    } catch (e: any) {
        results.supabase_auth = { ok: false, error: e?.message ?? 'Unknown error' };
    }

    // 2. Check database connectivity via Prisma
    try {
        if (prisma) {
            await (prisma as any).$queryRaw`SELECT 1`;
            results.database = { ok: true, provider: 'prisma' };
        } else {
            results.database = { ok: false, provider: 'none', error: 'Prisma not available on this runtime' };
        }
    } catch (e: any) {
        results.database = { ok: false, provider: 'prisma', error: e?.message ?? 'Unknown error' };
    }

    // 3. Check environment variable presence (never expose values)
    results.env = {
        supabase_url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        supabase_anon_key: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        service_role_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        database_url: !!process.env.DATABASE_URL,
    };

    const allOk = Object.values(results).every((r: any) =>
        typeof r === 'object' && r !== null ? (r.ok !== false) : true
    );

    return NextResponse.json({ success: allOk, results }, { status: allOk ? 200 : 500 });
}
