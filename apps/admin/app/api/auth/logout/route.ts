import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_SESSION_COOKIE, verifySessionCookieFast, revokeAdminSessionById } from '@/lib/auth';
import { getValidatedClientIp } from '@/lib/client-ip';
import { logAdminAction } from '@/lib/audit';

export async function POST(request: NextRequest) {
    const ip = getValidatedClientIp(request);
    const userAgent = request.headers.get('user-agent');
    const rawCookie = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;

    const session = await verifySessionCookieFast(rawCookie);
    if (session) {
        await revokeAdminSessionById(session.sessionId);
        await logAdminAction({
            adminId: session.adminId,
            action: 'ADMIN_LOGOUT',
            targetResource: 'AdminSession',
            targetId: session.sessionId,
            ipAddress: ip,
            userAgent,
        });
    }

    const response = NextResponse.json({ success: true, redirectUrl: '/login' });
    response.cookies.delete(ADMIN_SESSION_COOKIE);
    return response;
}

export async function GET(request: NextRequest) {
    const rawCookie = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
    const session = await verifySessionCookieFast(rawCookie);
    if (session) {
        await revokeAdminSessionById(session.sessionId);
    }
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete(ADMIN_SESSION_COOKIE);
    return response;
}
