import { publicErrorMessage } from '@/lib/security';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createAdminClient } from '@/utils/supabase/admin';
import { sendRecoveryEmail } from '@/lib/email';
import { rateLimitShared } from '@/lib/rate-limit';
import { reportServerError } from '@/lib/error-capture';

export async function POST(request: Request) {
    try {
        // Per-IP throttle first, then a per-address throttle so one inbox cannot be flooded from many IPs
        const ipLimited = await rateLimitShared(request, 'auth/forgot-password', 5, 10 * 60_000);
        if (ipLimited) return ipLimited;

        const body = await request.json().catch(() => ({})) as { email?: unknown };
        const email = typeof body.email === 'string' ? body.email.trim() : '';

        if (!email || email.length > 254) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        const emailLimited = await rateLimitShared(request, `auth/forgot-password:${email.toLowerCase()}`, 3, 60 * 60_000);
        if (emailLimited) return emailLimited;

        // 1. Verify user exists in the local database (with Supabase REST fallback if Prisma is null)
        let userExists = false;

        if (prisma) {
            const user = await prisma.user.findUnique({
                where: { email }
            });
            userExists = !!user;
        } else {
            console.warn('[Forgot Password API] Prisma is null/unavailable. Falling back to Supabase REST...');
            const supabaseAdmin = createAdminClient();
            const { data: dbUser, error: dbError } = await supabaseAdmin
                .from('User')
                .select('id')
                .eq('email', email)
                .maybeSingle();

            if (dbError) {
                console.error('[Forgot Password API] Supabase REST fallback query failed:', dbError.message);
            }
            userExists = !!dbUser;
        }

        if (!userExists) {
            // Return success even if email doesn't exist to prevent enumeration attacks
            return NextResponse.json({ success: true, message: 'Recovery instructions dispatched if the account exists.' });
        }

        // 2. Initialize Supabase Admin Client
        const supabaseAdmin = createAdminClient();

        // 3. Generate Auth Link (Recovery type)
        const origin = process.env.NEXT_PUBLIC_APP_URL || 'https://lucyos.5-cn.net';
        const { data, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
            type: 'recovery',
            email,
            options: {
                redirectTo: `${origin}/auth/callback?next=/reset-password`,
            }
        });

        if (linkError) {
            console.error('Link generation error:', linkError.message);
            return NextResponse.json({ error: 'Failed to generate secure recovery protocol link.' }, { status: 500 });
        }

        // Guard: user exists in Prisma but NOT in Supabase Auth
        if (!data?.user) {
            console.error(`Forgot password: ${email} is in Prisma but has no Supabase Auth account.`);
            // Return a safe success response to prevent enumeration
            return NextResponse.json({ success: true, message: 'Recovery instructions dispatched if the account exists.' });
        }

        const hashedToken = data.properties.hashed_token;
        const actionLink = data.properties.action_link;

        if (!hashedToken && !actionLink) {
            console.error('Forgot password: generateLink returned neither hashed_token nor action_link for', email);
            return NextResponse.json({ error: 'Failed to generate secure recovery protocol link.' }, { status: 500 });
        }

        // Direct token_hash link ensures server-side verifyOtp sets session cookies without hash fragment loss
        const recoveryLink = hashedToken
            ? `${origin}/auth/callback?token_hash=${hashedToken}&type=recovery&next=/reset-password`
            : actionLink;

        // 4. Send Custom Premium Email via Resend
        const emailResult = await sendRecoveryEmail(email, recoveryLink);

        if (!emailResult.success) {
            console.error('Resend email error:', emailResult.error);
            return NextResponse.json({ error: 'SMTP gateway message failure.' }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: 'Recovery instructions dispatched if the account exists.' });
    } catch (e: any) {
        console.error('Forgot password API error:', e);
        void reportServerError(e, { status: 500 });
        return NextResponse.json({ error: publicErrorMessage(e, 'Internal server error.') }, { status: 500 });
    }
}
