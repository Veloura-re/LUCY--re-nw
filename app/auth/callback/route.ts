import { NextResponse } from 'next/server';
import type { Session } from '@supabase/supabase-js';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { prisma } from '@/lib/prisma';
import { safeNextPath } from '@/lib/safe-redirect';
import { getValidatedClientIp } from '@/lib/client-ip';
import { recordAuthAudit } from '@/lib/auth-audit';
import { logActivity } from '@/lib/audit';
import { issueDeviceSession, setDeviceCookies } from '@/lib/device-session';

const NO_ACCOUNT_MESSAGE = 'No LUCY account found for this Google account. Ask your school for an invite, then sign in again.';

/** True when the session was created by an OAuth provider, read from the access token's authentication methods. */
function isOAuthSession(session: Session): boolean {
    try {
        const payload = JSON.parse(atob(session.access_token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
        return Array.isArray(payload.amr) && payload.amr.some((entry: { method?: string }) => entry?.method === 'oauth');
    } catch {
        return false;
    }
}

async function accountExists(userId: string, email?: string | null): Promise<{ id: string; schoolId: string | null } | null> {
    if (prisma?.user) {
        try {
            const byId = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, schoolId: true } });
            if (byId) return byId;

            if (email) {
                const byEmail = await prisma.user.findUnique({
                    where: { email: email.toLowerCase().trim() },
                    select: { id: true, schoolId: true }
                });
                if (byEmail) return byEmail;
            }
            return null;
        } catch (err: any) {
            console.warn('[Auth Callback] Prisma lookup failed, falling back to Supabase admin:', err.message);
        }
    }
    const admin = createAdminClient() as any;
    if (typeof admin?.from === 'function') {
        const { data: byId } = await admin.from('User').select('id, schoolId').eq('id', userId).maybeSingle();
        if (byId) return byId as { id: string; schoolId: string | null };

        if (email) {
            const { data: byEmail } = await admin.from('User').select('id, schoolId').ilike('email', email.trim()).maybeSingle();
            if (byEmail) return byEmail as { id: string; schoolId: string | null };
        }
    }

    return null;
}

/**
 * Google sign-in is only for accounts that already exist. Supabase creates an auth user on the first
 * Google sign-in, so that user is removed again here unless it matches an existing LUCY account.
 * Google users skip the emailed code; their session still needs the device session issued below.
 */
async function finishGoogleSignIn(request: Request, origin: string, session: Session) {
    const supabase = await createClient();
    const user = session.user;
    const google = user.identities?.find((identity) => identity.provider === 'google');
    const verified = google?.identity_data?.email_verified === true && Boolean(user.email_confirmed_at);
    const existing = google && verified ? await accountExists(user.id, user.email) : null;

    if (!existing) {
        const onlyGoogle = (user.identities?.length ?? 0) <= 1 && Boolean(google);
        if (onlyGoogle) {
            await createAdminClient().auth.admin.deleteUser(user.id).catch((err) => {
                console.error('[Auth Callback] Could not remove the unmatched Google user:', err?.message);
            });
        }
        await supabase.auth.signOut();
        await recordAuthAudit(getValidatedClientIp(request), user.email ?? '', 'GOOGLE_REJECTED');
        return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(NO_ACCOUNT_MESSAGE)}`);
    }

    const ip = getValidatedClientIp(request);
    const next = safeNextPath(new URL(request.url).searchParams.get('next'), '/dashboard');
    const token = await issueDeviceSession(user.id);
    await recordAuthAudit(ip, user.email ?? '', 'GOOGLE_LOGIN');
    await logActivity({
        userId: user.id,
        schoolId: existing.schoolId ?? undefined,
        action: 'LOGIN_GOOGLE',
        resourceType: 'auth',
        ip,
        userAgent: request.headers.get('user-agent') || undefined,
    });

    const response = NextResponse.redirect(`${origin}${next}`);
    await setDeviceCookies(response, user.id, token);
    return response;
}

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get('code');
    const token_hash = searchParams.get('token_hash') || searchParams.get('token');
    const type = searchParams.get('type');
    const next = safeNextPath(searchParams.get('next'), '/reset-password');

    const supabase = await createClient();

    // 1. Handle PKCE code exchange
    if (code) {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) {
            // Decided by how the session was created, never by a query parameter the caller controls.
            if (data?.session && isOAuthSession(data.session)) {
                return finishGoogleSignIn(request, origin, data.session);
            }
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
