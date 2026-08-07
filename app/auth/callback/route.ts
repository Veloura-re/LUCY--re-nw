import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get('code');
    const token_hash = searchParams.get('token_hash') || searchParams.get('token');
    const type = searchParams.get('type');
    const next = searchParams.get('next') ?? '/reset-password';

    const supabase = await createClient();

    // 1. Handle PKCE code exchange
    if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) {
            return NextResponse.redirect(`${origin}${next}`);
        }
        console.error('[Auth Callback] Code exchange error:', error.message);
    }

    // 2. Handle OTP token verification (Recovery / Magic Link / Email verification)
    if (token_hash) {
        const otpType = (type || 'recovery') as any;
        const { error } = await supabase.auth.verifyOtp({
            type: otpType,
            token_hash,
        });
        if (!error) {
            return NextResponse.redirect(`${origin}${next}`);
        }
        console.error('[Auth Callback] OTP verification error:', error.message);
        return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message || 'Password reset link is invalid or has expired.')}`);
    }

    // 3. Fallback for recovery redirect: if next is /reset-password, proceed to /reset-password so client listener can process hash tokens
    if (next.startsWith('/reset-password')) {
        return NextResponse.redirect(`${origin}${next}`);
    }

    // 4. Return the user to login with explicit error context
    return NextResponse.redirect(`${origin}/login?error=auth`);
}
