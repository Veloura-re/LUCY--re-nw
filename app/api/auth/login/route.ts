import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(req: Request) {
    try {
        const { email, password, turnstileToken } = await req.json();

        if (!email || !password || !turnstileToken) {
            return NextResponse.json({ error: "Missing required fields or Turnstile token." }, { status: 400 });
        }

        // Extract client IP address for rate limiting, ensuring we only take the first IP if multiple are passed
        const forwardedFor = req.headers.get('x-forwarded-for');
        const ip = forwardedFor ? forwardedFor.split(',')[0].trim() : (req.headers.get('cf-connecting-ip') || '127.0.0.1');

        // 1. Validate Turnstile Token with Cloudflare
        const turnstileBody = new URLSearchParams({
            secret: process.env.TURNSTILE_SECRET_KEY || '1x0000000000000000000000000000000AA',
            response: turnstileToken
        });

        const cfVerify = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: turnstileBody.toString()
        });
        
        const cfResponse = await cfVerify.json();
        // Skip validation failure in dev mode for easy testing if no real key is present
        if (!cfResponse.success && process.env.NODE_ENV === 'production') {
            await prisma.$executeRaw`INSERT INTO auth_audit_logs (ip_address, email, status) VALUES (${ip}, ${email}, 'BLOCKED_TURNSTILE')`.catch(()=>null);
            return NextResponse.json({ error: "Bot detected. Access Denied." }, { status: 403 });
        }

        // 2. Postgres Rate Limiting Check
        let rateLimitResult;
        try {
            rateLimitResult = await prisma.$queryRaw<{ allowed: boolean }[]>`SELECT enforce_login_rate_limit(${ip}::inet) as allowed`;
        } catch(e) {
            console.error("Rate limit check failed (schema might not be applied)", e);
            // Fail securely: if we cannot check the rate limit due to invalid IP or schema issue,
            // we should reject the login attempt to prevent brute force bypass.
            return NextResponse.json({ error: "Rate limit verification failed. Access Denied." }, { status: 403 });
        }
        
        if (rateLimitResult && rateLimitResult[0] && rateLimitResult[0].allowed === false) {
            await prisma.$executeRaw`INSERT INTO auth_audit_logs (ip_address, email, status) VALUES (${ip}, ${email}, 'RATE_LIMITED')`.catch(()=>null);
            return NextResponse.json({ error: "Too many login attempts. Try again later." }, { status: 429 });
        }

        // 3. Supabase Auth Login
        const supabase = await createClient();
        const { error: authError } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (authError) {
            await prisma.$executeRaw`INSERT INTO auth_audit_logs (ip_address, email, status) VALUES (${ip}, ${email}, 'FAILED_PASSWORD')`.catch(()=>null);
            return NextResponse.json({ error: authError.message }, { status: 401 });
        }

        // Success
        await prisma.$executeRaw`INSERT INTO auth_audit_logs (ip_address, email, status) VALUES (${ip}, ${email}, 'SUCCESS')`.catch(()=>null);
        return NextResponse.json({ success: true });

    } catch (e: unknown) {
        console.error("Login Error:", e);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
