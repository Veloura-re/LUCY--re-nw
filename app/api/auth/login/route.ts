import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';
import { prisma } from '@/lib/prisma';

// Helper to safely extract and validate client IP
function getClientIp(req: Request): string {
    // Cloudflare verified connecting IP is the most trustworthy
    const cfIp = req.headers.get('cf-connecting-ip');
    const realIp = req.headers.get('x-real-ip');
    const forwarded = req.headers.get('x-forwarded-for');

    let candidate = cfIp || realIp || (forwarded ? forwarded.split(',')[0].trim() : null) || '127.0.0.1';
    
    // Remove port if present (e.g. 192.168.1.1:4532 or [::1]:80)
    candidate = candidate.replace(/^\[?([^\]]+)\]?:[0-9]+$/, '$1').trim();

    // Normalize and validate IPv4 or IPv6
    const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    const ipv6Regex = /^[0-9a-fA-F:]{2,39}$/;

    if (ipv4Regex.test(candidate) || ipv6Regex.test(candidate)) {
        return candidate;
    }
    return '127.0.0.1';
}

async function recordAuditLog(ip: string, email: string, status: string) {
    if (!prisma) return;
    try {
        await prisma.$executeRaw`
            INSERT INTO auth_audit_logs (ip_address, email, status)
            VALUES (${ip}::inet, ${email}, ${status})
        `;
    } catch {
        // Suppress audit log errors to prevent blocking authentication
    }
}

export async function POST(req: Request) {
    try {
        let body: any;
        try {
            body = await req.json();
        } catch {
            return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
        }

        const { email, password, turnstileToken } = body || {};

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

        const clientIp = getClientIp(req);
        const isLocalhost = clientIp === '127.0.0.1' || clientIp === '::1';

        // 2. Validate Turnstile Token with Cloudflare (safe URL encoded parameters)
        const verifyParams = new URLSearchParams();
        verifyParams.append('secret', process.env.TURNSTILE_SECRET_KEY || '1x0000000000000000000000000000000AA');
        verifyParams.append('response', turnstileToken);
        verifyParams.append('remoteip', clientIp);

        const cfVerify = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: verifyParams.toString(),
        });
        
        const cfResponse = (await cfVerify.json()) as { success?: boolean; 'error-codes'?: string[] };
        if (!cfResponse?.success && process.env.NODE_ENV === 'production') {
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

        // 5. Invalidate previous sessions & establish new single-active-session token
        const sessionToken = globalThis.crypto.randomUUID();

        let updatedDb = false;
        if (prisma) {
            try {
                await prisma.user.update({
                    where: { id: authData.user.id },
                    data: { activeSessionId: sessionToken }
                });
                updatedDb = true;
            } catch (updateErr: any) {
                console.warn("[Login Route] Prisma update failed, falling back to Supabase Admin:", updateErr.message);
            }
        }

        if (!updatedDb && process.env.NEXT_PUBLIC_SUPABASE_URL) {
            try {
                const supabaseAdmin = createSupabaseAdmin(
                    process.env.NEXT_PUBLIC_SUPABASE_URL,
                    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
                );
                await supabaseAdmin
                    .from('User')
                    .update({ activeSessionId: sessionToken })
                    .eq('id', authData.user.id);
            } catch (supaErr: any) {
                console.warn("[Login Route] Supabase Admin fallback session update failed:", supaErr.message);
            }
        }

        // 6. Successful login: reset failed counter for this IP and record audit log
        await recordAuditLog(clientIp, sanitizedEmail, 'SUCCESS');
        if (prisma && !isLocalhost) {
            try {
                await prisma.$executeRaw`
                    SELECT reset_login_rate_limit(${clientIp}::inet)
                `;
            } catch {
                // Suppress error if function is missing
            }
        }

        // 7. Prepare response and set cookie directly to prevent race conditions
        const response = NextResponse.json({ success: true, sessionToken });
        response.cookies.set({
            name: 'lucy_device_session',
            value: sessionToken,
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 60 * 60 * 24 * 30, // 30 days
        });

        return response;

    } catch (e: any) {
        console.error("Login Error:", e);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
