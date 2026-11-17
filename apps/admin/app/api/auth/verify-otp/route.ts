import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { verifyOtpChallenge } from '@/lib/otp';
import { createAdminSession, ADMIN_SESSION_COOKIE, INACTIVITY_TIMEOUT_MS } from '@/lib/auth';
import { getDefaultRouteForRole } from '@/lib/rbac';
import { getValidatedClientIp } from '@/lib/client-ip';
import { logAdminAction } from '@/lib/audit';

const VerifySchema = z.object({
    challengeId: z.string().uuid(),
    code: z.string().regex(/^\d{6}$/, 'Code must be exactly 6 digits'),
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

    const parsed = VerifySchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ error: 'Invalid challenge ID or 6-digit verification code.' }, { status: 400 });
    }

    const { challengeId, code } = parsed.data;

    const result = await verifyOtpChallenge(challengeId, code);
    if (!result.valid || !result.adminId) {
        await logAdminAction({
            action: 'ADMIN_OTP_VERIFICATION_FAILED',
            targetResource: 'AdminOtpChallenge',
            targetId: challengeId,
            ipAddress: ip,
            userAgent,
            metadata: { reason: result.reason },
        });
        return NextResponse.json({ error: result.reason || 'Verification failed.' }, { status: 401 });
    }

    const admin = await prisma.adminUser.findUnique({
        where: { id: result.adminId },
    });

    if (!admin) {
        return NextResponse.json({ error: 'Administrator record not found.' }, { status: 404 });
    }

    const { cookieValue } = await createAdminSession(admin, ip, userAgent || undefined);

    await logAdminAction({
        adminId: admin.id,
        action: 'ADMIN_LOGIN_SUCCESS',
        targetResource: 'AdminUser',
        targetId: admin.id,
        ipAddress: ip,
        userAgent,
        metadata: { role: admin.role },
    });

    const destination = getDefaultRouteForRole(admin.role);
    const response = NextResponse.json({
        success: true,
        role: admin.role,
        redirectUrl: destination,
    });

    response.cookies.set({
        name: ADMIN_SESSION_COOKIE,
        value: cookieValue,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: INACTIVITY_TIMEOUT_MS / 1000,
        path: '/',
    });

    return response;
}
