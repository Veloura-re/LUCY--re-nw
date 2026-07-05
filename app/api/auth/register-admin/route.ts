import { NextResponse } from 'next/server';
import { rateLimit, secureJson } from '@/lib/security';
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';

export async function POST(request: Request) {
    const limit = rateLimit(request, "auth/register-admin", 3); // Very strict for admin reg
    if (limit) return limit;

    const { userId, email, name, secretKey } = await request.json() as any;

    // Check against ENV variable (REQUIRED)
    const VALID_SECRET = process.env.ADMIN_SECRET_KEY;

    if (!VALID_SECRET) {
        console.error("ADMIN_SECRET_KEY is not configured in environment variables.");
        return NextResponse.json({ error: 'Server configuration error.' }, { status: 500 });
    }

    // Cloudflare Workers has global crypto implementation. Web Crypto API subtle crypto handles timing attacks.
    // However, for simple string comparison in Edge/Workers where Node crypto isn't available, we can
    // use a simple constant-time comparison manually.
    const providedKey = secretKey?.trim() || "";
    const expectedKey = VALID_SECRET.trim();

    let isMatch = providedKey.length === expectedKey.length;
    let mismatch = 0;

    // We do a constant time comparison. If lengths differ, we still loop to avoid timing leak on length
    for (let i = 0; i < expectedKey.length; i++) {
        const charA = isMatch ? providedKey.charCodeAt(i) : expectedKey.charCodeAt(i);
        const charB = expectedKey.charCodeAt(i);
        mismatch |= (charA ^ charB);
    }

    if (mismatch !== 0 || !isMatch) {
        return secureJson({ error: 'Invalid Administration Key.' }, 403);
    }

    try {
        const supabaseAdmin = createSupabaseAdmin(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        const { data: user, error } = await supabaseAdmin.from('User').insert({
            id: userId,
            email,
            name,
            role: 'SUPERADMIN',
            verified: true,
            updatedAt: new Date().toISOString()
        }).select().single();

        if (error) throw error;

        return secureJson({ user });
    } catch (e: any) {
        console.error(e);
        return secureJson({ error: "Internal Server Error" }, 500); // Masked
    }
}
