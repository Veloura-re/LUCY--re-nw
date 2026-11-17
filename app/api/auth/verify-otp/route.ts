import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { prisma } from '@/lib/prisma';
import { rateLimitShared } from '@/lib/rate-limit';
import { getValidatedClientIp } from '@/lib/client-ip';
import { recordAuthAudit } from '@/lib/auth-audit';
import { getSchoolRoleRedirect } from '@/lib/navigation';
import { logActivity } from '@/lib/audit';
import { recordConsent } from '@/lib/consent';
import { issueDeviceSession, setDeviceCookies } from '@/lib/device-session';
import { verifyChallenge, trustDevice, trustedCookieOptions, TRUSTED_COOKIE } from '@/lib/login-otp';

/**
 * Second step of sign-in. The caller already holds a Supabase session from the password step, but
 * that session is not usable anywhere until this route issues the device session.
 */
export async function POST(request: Request) {
    const limited = await rateLimitShared(request, 'auth/verify-otp', 30, 10 * 60_000);
    if (limited) return limited;

    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Your sign-in expired. Please sign in again.' }, { status: 401 });

        const perUser = await rateLimitShared(request, `auth/verify-otp:${user.id}`, 10, 10 * 60_000);
        if (perUser) return perUser;

        const body = (await request.json().catch(() => ({}))) as { code?: unknown; rememberDevice?: unknown };
        const code = typeof body.code === 'string' ? body.code.trim() : '';
        if (!/^\d{6}$/.test(code)) return NextResponse.json({ error: 'Enter the 6-digit code from your email.' }, { status: 400 });

        const ip = getValidatedClientIp(request);
        const result = await verifyChallenge(user.id, code);

        if (!result.ok) {
            await recordAuthAudit(ip, user.email ?? '', result.reason === 'LOCKED' ? 'OTP_LOCKED' : 'OTP_FAILED');
            if (result.reason === 'INVALID') {
                return NextResponse.json({ error: 'That code is not correct.', attemptsLeft: result.attemptsLeft }, { status: 400 });
            }
            if (result.reason === 'LOCKED') {
                return NextResponse.json({ error: 'Too many wrong codes. Request a new code.' }, { status: 429 });
            }
            return NextResponse.json({ error: 'This code has expired. Request a new one.' }, { status: 400 });
        }

        const sessionToken = await issueDeviceSession(user.id);
        await recordAuthAudit(ip, user.email ?? '', 'OTP_VERIFIED');

        const dbUser = prisma?.user
            ? await prisma.user.findUnique({ where: { id: user.id }, select: { role: true, schoolId: true } }).catch(() => null)
            : null;
        await logActivity({
            userId: user.id,
            schoolId: dbUser?.schoolId ?? undefined,
            action: 'LOGIN_OTP_VERIFIED',
            resourceType: 'auth',
            ip,
            userAgent: request.headers.get('user-agent') || undefined,
        });

        if (result.acceptedTerms === true) {
            await recordConsent({ userId: user.id, source: 'login', request }).catch((e) => {
                console.warn('[verify-otp] Consent record failed:', e?.message);
            });
        }

        const role = dbUser?.role || 'OWNER';
        const redirectUrl = getSchoolRoleRedirect(role);
        const response = NextResponse.json({ success: true, role, redirectUrl });
        await setDeviceCookies(response, user.id, sessionToken);
        if (body.rememberDevice === true) {
            const token = await trustDevice(user.id, request.headers.get('user-agent') || undefined);
            response.cookies.set({ name: TRUSTED_COOKIE, value: token, ...trustedCookieOptions() });
        }
        return response;
    } catch (e: any) {
        console.error('[verify-otp] Failed:', e?.message);
        return NextResponse.json({ error: 'We could not check your code. Please try again.' }, { status: 500 });
    }
}
