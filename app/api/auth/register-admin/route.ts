import { NextResponse } from 'next/server';
import { rateLimit, secureJson } from '@/lib/security';
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';
import crypto from 'crypto';

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

    const keyBuffer = Buffer.from(secretKey?.trim() || '');
    const validBuffer = Buffer.from(VALID_SECRET?.trim() || '');

    let isMatch = false;
    if (keyBuffer.length === validBuffer.length && keyBuffer.length > 0) {
        isMatch = crypto.timingSafeEqual(keyBuffer, validBuffer);
    }

    if (!isMatch) {
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
