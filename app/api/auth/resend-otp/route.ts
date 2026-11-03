import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { rateLimitShared } from '@/lib/rate-limit';
import { getValidatedClientIp } from '@/lib/client-ip';
import { recordAuthAudit } from '@/lib/auth-audit';
import { logActivity } from '@/lib/audit';
import { sendLoginCodeEmail } from '@/lib/email';
import { createChallenge, latestChallenge, isOtpRequiredFor, RESEND_COOLDOWN_MS } from '@/lib/login-otp';

/** Sends a fresh sign-in code to the signed-in (password-verified) user. Replaces the previous code. */
export async function POST(request: Request) {
    const limited = await rateLimitShared(request, 'auth/resend-otp', 20, 60 * 60_000);
    if (limited) return limited;

    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !isOtpRequiredFor(user.email)) {
            return NextResponse.json({ error: 'Your sign-in expired. Please sign in again.' }, { status: 401 });
        }

        const perUser = await rateLimitShared(request, `auth/resend-otp:${user.id}`, 5, 60 * 60_000);
        if (perUser) return perUser;

        const previous = await latestChallenge(user.id);
        const waitMs = previous ? RESEND_COOLDOWN_MS - (Date.now() - previous.createdAt.getTime()) : 0;
        if (waitMs > 0) {
            const retryAfter = Math.ceil(waitMs / 1000);
            const res = NextResponse.json({ error: `Wait ${retryAfter}s before requesting another code.`, retryAfter }, { status: 429 });
            res.headers.set('Retry-After', String(retryAfter));
            return res;
        }

        const ip = getValidatedClientIp(request);
        const { code } = await createChallenge({
            userId: user.id,
            ip,
            userAgent: request.headers.get('user-agent') || undefined,
            acceptedTerms: previous?.acceptedTerms ?? false,
        }).catch((e) => {
            if (e?.message === 'TOO_MANY_CODES') return { code: '' };
            throw e;
        });
        if (!code) return NextResponse.json({ error: 'Too many codes requested. Please wait an hour and try again.' }, { status: 429 });
        const sent = await sendLoginCodeEmail(user.email!, code);
        if (!sent.success && !(sent.simulated && process.env.NODE_ENV !== 'production')) {
            return NextResponse.json({ error: 'We could not send your sign-in code. Please try again shortly.' }, { status: 503 });
        }
        await recordAuthAudit(ip, user.email!, 'OTP_RESENT');
        await logActivity({ userId: user.id, action: 'LOGIN_OTP_RESENT', resourceType: 'auth', ip });
        return NextResponse.json({ success: true });
    } catch (e: any) {
        console.error('[resend-otp] Failed:', e?.message);
        return NextResponse.json({ error: 'We could not send your sign-in code. Please try again shortly.' }, { status: 500 });
    }
}
