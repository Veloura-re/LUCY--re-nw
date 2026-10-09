import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { prisma } from '@/lib/prisma';
import { rateLimit } from '@/lib/security';

/**
 * Connectivity self-check for signed-in users. Reports pass/fail only; internal error text,
 * identifiers and configuration state are never returned.
 */
export async function GET(request: Request) {
    const limited = rateLimit(request, 'diagnostic', 10);
    if (limited) return limited;

    const results: Record<string, { ok: boolean }> = {};

    // 1. Check Supabase auth. A signed-in session is required to use this endpoint.
    let signedIn = false;
    try {
        const supabase = await createClient();
        const { data: { user }, error } = await supabase.auth.getUser();
        signedIn = !error && !!user;
        results.supabase_auth = { ok: signedIn };
    } catch (e) {
        console.error('[Diagnostic] Supabase auth check failed:', e);
        results.supabase_auth = { ok: false };
    }

    if (!signedIn) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Check database connectivity via Prisma
    try {
        if (!prisma) throw new Error('Prisma not available on this runtime');
        await (prisma as any).$queryRaw`SELECT 1`;
        results.database = { ok: true };
    } catch (e) {
        console.error('[Diagnostic] Database check failed:', e);
        results.database = { ok: false };
    }

    const allOk = Object.values(results).every(r => r.ok);

    return NextResponse.json({ success: allOk, results }, { status: allOk ? 200 : 500 });
}
