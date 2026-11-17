import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { verifyPassword, MAX_LOGIN_ATTEMPTS, LOCKOUT_DURATION_MS } from '@/lib/auth';
import { createOtpChallenge, sendAdminOtpEmail } from '@/lib/otp';
import { getValidatedClientIp } from '@/lib/client-ip';
import { logAdminAction } from '@/lib/audit';

const LoginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
});

export async function POST(request: NextRequest) {
    const ip = getValidatedClientIp(request);
    const userAgent = request.headers.get('user-agent');

    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Malformed JSON payload.' }, { status: 400 });
    }

    const parsed = LoginSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ error: 'Valid email and password (minimum 8 characters) required.' }, { status: 400 });
    }

    const { email, password } = parsed.data;

    const admin = await prisma.adminUser.findUnique({
        where: { email: email.toLowerCase().trim() },
    });

    if (!admin) {
        await logAdminAction({
            action: 'ADMIN_LOGIN_FAILED_UNKNOWN_EMAIL',
            targetResource: 'AdminUser',
            ipAddress: ip,
            userAgent,
            metadata: { email: email.toLowerCase().trim() },
        });
        return NextResponse.json({ error: 'Invalid administrator credentials.' }, { status: 401 });
    }

    const now = new Date();
    if (admin.lockedUntil && admin.lockedUntil > now) {
        const remainingMinutes = Math.ceil((admin.lockedUntil.getTime() - now.getTime()) / 60000);
        return NextResponse.json(
            { error: `Account locked due to consecutive failed attempts. Retry in ${remainingMinutes} minute(s).` },
            { status: 423 }
        );
    }

    const passwordMatch = await verifyPassword(password, admin.passwordHash);
    if (!passwordMatch) {
        const nextAttempts = admin.failedLoginAttempts + 1;
        const willLock = nextAttempts >= MAX_LOGIN_ATTEMPTS;

        await prisma.adminUser.update({
            where: { id: admin.id },
            data: {
                failedLoginAttempts: nextAttempts,
                lockedUntil: willLock ? new Date(now.getTime() + LOCKOUT_DURATION_MS) : null,
            },
        });

        await logAdminAction({
            adminId: admin.id,
            action: willLock ? 'ADMIN_ACCOUNT_LOCKED' : 'ADMIN_LOGIN_PASSWORD_FAILED',
            targetResource: 'AdminUser',
            targetId: admin.id,
            ipAddress: ip,
            userAgent,
            metadata: { attempts: nextAttempts },
        });

        if (willLock) {
            return NextResponse.json(
                { error: 'Account locked for 15 minutes due to 5 consecutive failed attempts.' },
                { status: 423 }
            );
        }

        return NextResponse.json(
            { error: `Invalid credentials. ${MAX_LOGIN_ATTEMPTS - nextAttempts} attempt(s) remaining.` },
            { status: 401 }
        );
    }

    // Reset failed counter
    await prisma.adminUser.update({
        where: { id: admin.id },
        data: {
            failedLoginAttempts: 0,
            lockedUntil: null,
        },
    });

    // Create mandatory 2FA OTP challenge
    const { challengeId, code } = await createOtpChallenge(admin.id);
    await sendAdminOtpEmail(admin.email, code, admin.name);

    await logAdminAction({
        adminId: admin.id,
        action: 'ADMIN_OTP_CHALLENGE_ISSUED',
        targetResource: 'AdminOtpChallenge',
        targetId: challengeId,
        ipAddress: ip,
        userAgent,
    });

    return NextResponse.json({
        success: true,
        requiresOtp: true,
        challengeId,
        maskedEmail: admin.email.replace(/(?<=.{2}).(?=.*@)/g, '*'),
    });
}
