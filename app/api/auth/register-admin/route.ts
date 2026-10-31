import { NextResponse } from 'next/server';
import { secureJson, safeEqual } from '@/lib/security';
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';
import { rateLimitShared } from '@/lib/rate-limit';
import { logActivity } from '@/lib/audit';
import { sendWelcomeEmail } from '@/lib/email';
import { isValidEmail } from '@/lib/security';
import { recordConsent } from '@/lib/consent';

export async function POST(request: Request) {
    const limit = await rateLimitShared(request, "auth/register-admin", 3); // Very strict for admin reg
    if (limit) return limit;

    const { userId, email, name, secretKey, acceptedTerms } = ((await request.json().catch(() => ({}))) || {}) as any;

    // Check against ENV variable (REQUIRED)
    const VALID_SECRET = process.env.ADMIN_SECRET_KEY;

    if (!VALID_SECRET) {
        console.error("ADMIN_SECRET_KEY is not configured in environment variables.");
        return NextResponse.json({ error: 'Server configuration error.' }, { status: 500 });
    }

    if (!safeEqual(secretKey?.trim() || '', VALID_SECRET?.trim() || '')) {
        return secureJson({ error: 'Invalid Administration Key.' }, 403);
    }

    try {
        if (acceptedTerms !== true) {
            return secureJson({ error: 'You must accept the Terms of Service and Privacy Policy.' }, 400);
        }

        const supabaseAdmin = createSupabaseAdmin(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        if (typeof userId !== 'string' || !isValidEmail(email) || typeof name !== 'string' || name.trim().length === 0 || name.length > 120) {
            return secureJson({ error: 'Invalid registration request.' }, 400);
        }

        // The id and email must belong to the same, already created auth identity.
        const { data: authLookup, error: authLookupError } = await supabaseAdmin.auth.admin.getUserById(userId);
        if (authLookupError || !authLookup?.user || authLookup.user.email?.toLowerCase() !== email.toLowerCase()) {
            return secureJson({ error: 'Invalid registration request.' }, 400);
        }

        const { data: user, error } = await supabaseAdmin.from('User').insert({
            id: userId,
            email,
            name: name.trim(),
            role: 'SUPERADMIN',
            verified: true,
            updatedAt: new Date().toISOString()
        }).select().single();

        if (error) throw error;

        await recordConsent({ userId, source: 'register-admin', request });

        // Platform-level action: there is no tenant, so the audit entry carries no schoolId.
        await logActivity({
            userId,
            action: 'REGISTER_SUPERADMIN',
            resourceType: 'user',
            resourceId: userId,
            level: 'WARN',
            ip: request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || undefined
        });

        sendWelcomeEmail({
            toEmail: email,
            name: name,
            role: 'SUPERADMIN'
        }).catch((emailErr) => console.warn('[register-admin] Welcome email failed:', emailErr));

        return secureJson({ user });
    } catch (e: any) {
        console.error(e);
        return secureJson({ error: "Internal Server Error" }, 500); // Masked
    }
}
