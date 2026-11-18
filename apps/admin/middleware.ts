import { type NextRequest, NextResponse } from 'next/server';
import { ADMIN_SESSION_COOKIE, INACTIVITY_TIMEOUT_MS, verifySessionCookieFast, signSessionCookie } from './lib/session-cookie';
import { isRoleAllowedForPath, getDefaultRouteForRole } from './lib/rbac';

export const runtime = 'experimental-edge';

function applySecurityHeaders(response: NextResponse) {
    const headers: Record<string, string> = {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
        'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), browsing-topics=()',
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cross-Origin-Embedder-Policy': 'credentialless',
        'Cross-Origin-Resource-Policy': 'same-origin',
        'Content-Security-Policy': "default-src 'none'; base-uri 'self'; object-src 'none'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self' https:; frame-src 'none'; worker-src 'self' blob:; manifest-src 'self';",
    };

    Object.entries(headers).forEach(([k, v]) => response.headers.set(k, v));
}

export async function middleware(request: NextRequest) {
    const path = request.nextUrl.pathname;
    const isAuthRoute = path === '/login' || path === '/login/verify-otp' || path.startsWith('/api/auth');
    const isUnauthorizedPage = path === '/unauthorized';
    const isApiRoute = path.startsWith('/api');

    const rawCookie = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
    const session = await verifySessionCookieFast(rawCookie);

    // 1. Authenticated user attempting to visit login page -> redirect to their section
    if (session && isAuthRoute && !path.startsWith('/api/auth/logout')) {
        const dest = getDefaultRouteForRole(session.role);
        const res = NextResponse.redirect(new URL(dest, request.url));
        applySecurityHeaders(res);
        return res;
    }

    // 2. Unauthenticated user accessing protected route
    if (!session && !isAuthRoute && !isUnauthorizedPage) {
        if (isApiRoute) {
            const res = NextResponse.json(
                { error: 'Authentication required. Session expired or missing.' },
                { status: 401 }
            );
            applySecurityHeaders(res);
            return res;
        }

        const loginUrl = new URL('/login', request.url);
        if (path !== '/') {
            loginUrl.searchParams.set('from', path);
        }
        const res = NextResponse.redirect(loginUrl);
        applySecurityHeaders(res);
        return res;
    }

    // 3. Authenticated user accessing root -> redirect to their section
    if (session && path === '/') {
        const dest = getDefaultRouteForRole(session.role);
        const res = NextResponse.redirect(new URL(dest, request.url));
        applySecurityHeaders(res);
        return res;
    }

    // 4. Role Authorization Check: Ensure role can only access their specific section
    if (session && !isAuthRoute && !isUnauthorizedPage) {
        const allowed = isRoleAllowedForPath(session.role, path);
        if (!allowed) {
            if (isApiRoute) {
                const res = NextResponse.json(
                    { error: 'Access forbidden: Role lacks clearance for this section.' },
                    { status: 403 }
                );
                applySecurityHeaders(res);
                return res;
            }

            const unauthUrl = new URL('/unauthorized', request.url);
            unauthUrl.searchParams.set('role', session.role);
            const res = NextResponse.redirect(unauthUrl);
            applySecurityHeaders(res);
            return res;
        }
    }

    const response = NextResponse.next();
    applySecurityHeaders(response);

    // 5. Sliding window: update cookie with latest timestamp if active session
    if (session) {
        const updatedCookie = await signSessionCookie({
            adminId: session.adminId,
            role: session.role,
            lastActiveAt: Date.now(),
            sessionId: session.sessionId,
        });

        response.cookies.set({
            name: ADMIN_SESSION_COOKIE,
            value: updatedCookie,
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: INACTIVITY_TIMEOUT_MS / 1000,
            path: '/',
        });
    }

    return response;
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
};
