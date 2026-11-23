import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { recordConsent } from '@/lib/consent';
import { getValidatedClientIp } from '@/lib/client-ip';
import { recordAuthAudit as recordAuditLog } from '@/lib/auth-audit';
import { issueDeviceSession, setDeviceCookies } from '@/lib/device-session';
import { createChallenge, isOtpRequiredFor, isTrustedDevice, trustedCookieOptions, TRUSTED_COOKIE } from '@/lib/login-otp';
import { sendLoginCodeEmail } from '@/lib/email';
import { getSchoolRoleRedirect } from '@/lib/navigation';
import { verifyBotId } from '@/lib/botid';

export async function POST(req: Request) {
    try {
        let body: any;
        try {
            body = await req.json();
        } catch {
            return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
        }

        const { email, password, turnstileToken } = body || {};

        // 0. BotID Verification (Vercel Automated Traffic Filter)
        const botCheck = await verifyBotId();
        if (botCheck.isBot && botCheck.response) {
            return botCheck.response;
        }

        // 1. Strict Input Validation
        if (typeof email !== 'string' || typeof password !== 'string' || typeof turnstileToken !== 'string') {
            return NextResponse.json({ error: "Missing or invalid required fields." }, { status: 400 });
        }

        const sanitizedEmail = email.trim().toLowerCase();
        if (!sanitizedEmail || sanitizedEmail.length > 255 || !sanitizedEmail.includes('@')) {
            return NextResponse.json({ error: "Invalid email address format." }, { status: 400 });
        }

        if (!password || password.length > 500) {
            return NextResponse.json({ error: "Invalid password format." }, { status: 400 });
        }

        if (!turnstileToken || turnstileToken.length > 4096) {
            return NextResponse.json({ error: "Invalid verification token." }, { status: 400 });
        }

        const clientIp = getValidatedClientIp(req);
        const isLocalhost = process.env.NODE_ENV !== 'production';

        // 2. Validate Turnstile Token with Cloudflare (safe URL encoded parameters).
        // In production this fails closed: a missing secret, an unreachable verifier or an
        // unparseable answer all block the login instead of letting it through.
        const isProduction = process.env.NODE_ENV === 'production';
        const turnstileSecret = process.env.TURNSTILE_SECRET_KEY
            || (isProduction ? '' : '1x0000000000000000000000000000000AA'); // Cloudflare's always-pass test secret, development only

        if (!turnstileSecret) {
            console.error('[Login] TURNSTILE_SECRET_KEY is not configured; refusing all logins.');
            return NextResponse.json({ error: "Login is temporarily unavailable. Please try again later." }, { status: 503 });
        }

        let turnstilePassed = false;
        try {
            const verifyParams = new URLSearchParams();
            verifyParams.append('secret', turnstileSecret);
            verifyParams.append('response', turnstileToken);
            verifyParams.append('remoteip', clientIp);

            const cfVerify = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: verifyParams.toString(),
            });
            const cfResponse = (await cfVerify.json()) as { success?: boolean; 'error-codes'?: string[] };
            turnstilePassed = cfResponse?.success === true;
        } catch (e) {
            console.error('[Login] Turnstile verification could not be completed:', (e as Error).message);
            if (isProduction) {
                return NextResponse.json({ error: "Security check unavailable. Please try again shortly." }, { status: 503 });
            }
        }

        if (!turnstilePassed && isProduction) {
            await recordAuditLog(clientIp, sanitizedEmail, 'BLOCKED_TURNSTILE');
            return NextResponse.json({ error: "Security check failed. Access Denied." }, { status: 403 });
        }

        // 3. Isolated Rate Limiting Check (50 attempts per 1 hour per specific client IP)
        if (prisma && !isLocalhost) {
            try {
                const rateLimitResult = await prisma.$queryRaw<Array<{ allowed: boolean }>>`
                    SELECT enforce_login_rate_limit(${clientIp}::inet) as allowed
                `;
                if (rateLimitResult && rateLimitResult[0] && rateLimitResult[0].allowed === false) {
                    await recordAuditLog(clientIp, sanitizedEmail, 'RATE_LIMITED');
                    return NextResponse.json(
                        { error: "Too many login attempts from this IP. Please try again in 1 hour." }, 
                        { status: 429, headers: { 'Retry-After': '3600' } }
                    );
                }
            } catch (e) {
                // Rate limit function or table may not be initialized yet; continue safely
            }
        }

        // 4. Supabase Auth Login
        const supabase = await createClient();
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email: sanitizedEmail,
            password,
        });

        if (authError || !authData?.user) {
            await recordAuditLog(clientIp, sanitizedEmail, 'FAILED_PASSWORD');
            return NextResponse.json({ error: authError?.message || "Authentication failed" }, { status: 401 });
        }

        // 5. Password is correct. Decide whether this browser still has to prove it with the emailed code.
        const userId = authData.user.id;
        const needsCode = isOtpRequiredFor(authData.user.email);
        const cookieStore = await cookies();
        const trusted = needsCode && await isTrustedDevice(userId, cookieStore.get(TRUSTED_COOKIE)?.value);

        if (needsCode && !trusted) {
            try {
                const { code } = await createChallenge({
                    userId,
                    ip: clientIp,
                    userAgent: req.headers.get('user-agent') || undefined,
                    acceptedTerms: body?.acceptedTerms === true,
                });
                const sent = await sendLoginCodeEmail(authData.user.email!, code);
                // Without a mail key the code is printed to the server console, outside production only.
                if (!sent.success && !(sent.simulated && process.env.NODE_ENV !== 'production')) {
                    throw new Error('Sign-in code email failed');
                }
            } catch (otpErr: any) {
                console.error('[Login Route] Could not send the sign-in code:', otpErr?.message);
                await supabase.auth.signOut();
                if (otpErr?.message === 'TOO_MANY_CODES') {
                    return NextResponse.json({ error: "Too many codes requested. Please wait an hour and try again." }, { status: 429 });
                }
                return NextResponse.json({ error: "We could not send your sign-in code. Please try again shortly." }, { status: 503 });
            }
            await recordAuditLog(clientIp, sanitizedEmail, 'OTP_SENT');
            // The Supabase session exists but is not usable: no device session is issued until the code is entered.
            return NextResponse.json({ success: true, otpRequired: true });
        }

        // 6. Fully signed in: single active session, audit entry, limiter reset.
        const sessionToken = await issueDeviceSession(userId);

        await recordAuditLog(clientIp, sanitizedEmail, trusted ? 'SUCCESS_TRUSTED_DEVICE' : 'SUCCESS');
        if (prisma && !isLocalhost) {
            try {
                await prisma.$executeRaw`
                    SELECT reset_login_rate_limit(${clientIp}::inet)
                `;
            } catch {
                // Suppress error if function is missing
            }
        }

        // The sign-in form only submits with the Terms box ticked. Recording it here also covers
        // accounts created before consent was stored; the dashboard gate catches any miss.
        if (body?.acceptedTerms === true) {
            await recordConsent({ userId, source: 'login', request: req }).catch((consentErr) => {
                console.warn("[Login Route] Consent record failed:", consentErr?.message);
            });
        }

        // 7. The device session lives only in the HttpOnly cookie so page scripts can never read it.
        const dbUser = prisma?.user ? await prisma.user.findUnique({ where: { id: userId }, select: { role: true } }).catch(() => null) : null;
        const role = dbUser?.role || 'OWNER';
        const redirectUrl = getSchoolRoleRedirect(role);
        const response = NextResponse.json({ success: true, userId, role, redirectUrl });
        await setDeviceCookies(response, userId, sessionToken);
        if (trusted) {
            // isTrustedDevice already extended the stored expiry; extend the cookie to match.
            response.cookies.set({ name: TRUSTED_COOKIE, value: cookieStore.get(TRUSTED_COOKIE)!.value, ...trustedCookieOptions() });
        }

        return response;

    } catch (e: any) {
        console.error("Login Error:", e);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
