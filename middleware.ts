import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { getClientIp } from '@/lib/client-ip'
import { DEVICE_MARK_COOKIE, LEGACY_UPGRADE_UNTIL, isValidDeviceMark } from '@/lib/device-mark'

/**
 * Next.js Edge Middleware.
 * This handles authentication redirection and security headers.
 * Cloudflare OpenNext requires Edge runtime for global request interception.
 */
export const runtime = 'experimental-edge'

const rateLimitMap = new Map<string, { count: number, resetTime: number }>();
const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST;
const posthogAssetsHost = posthogHost?.replace(/^https?:\/\/[^.]+/, 'https://*') ?? '';

function checkRateLimit(ip: string, path: string): boolean {
    // Development bypass only. A missing IP header must never exempt a request in production.
    if (process.env.NODE_ENV !== 'production') return true;

    const isAuth = path.startsWith('/api/auth/');
    const limit = isAuth ? 120 : 300; // 120 req/min for auth actions, 300 req/min for standard API
    const windowMs = 60 * 1000;
    
    const key = `${ip}:${isAuth ? 'auth' : 'api'}`;
    const now = Date.now();
    const record = rateLimitMap.get(key);

    if (!record || now > record.resetTime) {
        rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
        // Clean up old entries occasionally
        if (rateLimitMap.size > 10000) rateLimitMap.clear();
        return true;
    }

    if (record.count >= limit) return false;

    record.count += 1;
    return true;
}

function jsonError(status: number, error: string, extra: Record<string, string> = {}) {
    return new NextResponse(JSON.stringify({ error }), {
        status,
        headers: { 'Content-Type': 'application/json', ...extra }
    })
}

function isMutating(request: NextRequest) {
    return ['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)
}

const LARGE_BODY_LIMIT = 10 * 1024 * 1024
const DEFAULT_BODY_LIMIT = 1024 * 1024

/** Upload and image-extraction endpoints legitimately carry larger bodies. */
function checkBodySize(request: NextRequest, path: string) {
    const isLargeRoute = path.endsWith('/upload') || path.endsWith('/extract')
    const limit = isLargeRoute ? LARGE_BODY_LIMIT : DEFAULT_BODY_LIMIT
    const contentLength = parseInt(request.headers.get('content-length') || '0', 10)
    if (contentLength > limit) return jsonError(413, "Payload too large")
    return null
}

/**
 * Origin check for mutating requests. Requests without an Origin header (webhooks, server-to-server)
 * are not browser-initiated and are left to the route's own authentication.
 * Extra trusted origins (for example preview deployments) go in ALLOWED_ORIGINS, comma separated.
 */
function checkOrigin(request: NextRequest) {
    const origin = request.headers.get('origin')
    if (!origin || process.env.NODE_ENV !== 'production') return null

    let originHost: string
    try {
        originHost = new URL(origin).hostname
    } catch {
        return jsonError(403, "CSRF: Malformed origin")
    }

    const rawHost = request.headers.get('x-forwarded-host') || request.headers.get('host') || ''
    const requestHost = rawHost.split(':')[0].trim()
    const trusted = new Set<string>([requestHost])

    const addHost = (value: string | undefined) => {
        if (!value) return
        try { trusted.add(new URL(value.includes('://') ? value : `https://${value}`).hostname) } catch { /* ignore */ }
    }
    addHost(process.env.NEXT_PUBLIC_APP_URL)
    ;(process.env.ALLOWED_ORIGINS || '').split(',').forEach(v => addHost(v.trim()))

    if (!trusted.has(originHost)) return jsonError(403, "CSRF: Origin mismatch")
    return null
}

function applySecurityHeaders(response: NextResponse) {
    const securityHeaders: Record<string, string> = {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy': 'camera=(self), microphone=(), geolocation=(), browsing-topics=()',
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Content-Security-Policy': `default-src 'self'; base-uri 'self'; object-src 'none'; form-action 'self' https:; frame-ancestors 'none'; upgrade-insecure-requests; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://ajax.cloudflare.com https://static.cloudflareinsights.com https://*.cloudflare.com https://*.supabase.co https://*.turnstile.com https://challenges.cloudflare.com https://*.posthog.com https://*.i.posthog.com ${posthogAssetsHost}; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob: https:; font-src 'self' data: https://fonts.gstatic.com https://fonts.googleapis.com; connect-src 'self' https://*.supabase.co https://*.supabase.in https://*.cloudflare.com https://challenges.cloudflare.com wss://*.supabase.co https://*.posthog.com https://*.i.posthog.com ${posthogHost ?? ''}; frame-src 'self' https://challenges.cloudflare.com https://*.supabase.co https://*.supabase.in; worker-src 'self' blob:;`, 
        'Link': process.env.NEXT_PUBLIC_SUPABASE_URL ? `<${process.env.NEXT_PUBLIC_SUPABASE_URL}>; rel=preconnect` : '',
    }
    Object.entries(securityHeaders).forEach(([key, value]) => {
        if (value) response.headers.set(key, value)
    })

    // Stricter policy in report-only mode: nothing is blocked, but browsers list in the console every
    // resource that would break once 'unsafe-eval' is removed. Use it to plan the move to nonces.
    response.headers.set(
        'Content-Security-Policy-Report-Only',
        securityHeaders['Content-Security-Policy'].replace(" 'unsafe-eval'", '').replace('upgrade-insecure-requests;', '')
    )
}

export async function middleware(request: NextRequest) {
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-pathname', request.nextUrl.pathname)

    let response = NextResponse.next({
        request: {
            headers: requestHeaders,
        },
    })

    let user: any = null;

    // 2. Define protected paths
    const url = request.nextUrl.clone()
    const path = url.pathname

    const isAuthPage = path === '/login' || path === '/register'
    const isAdminPage = path.startsWith('/admin')
    const isDashboardPage = path.startsWith('/dashboard')
    const isApiPage = path.startsWith('/api')

    // ─────────────────────────────────────────────────
    // RATE LIMITING, CSRF, SIZE LIMIT AND HEADERS FOR API ROUTES
    // ─────────────────────────────────────────────────
    if (isApiPage) {
        if (!checkRateLimit(getClientIp(request), path)) {
            return jsonError(429, "Too Many Requests. Please wait before retrying.", { 'Retry-After': '60' })
        }

        if (isMutating(request)) {
            const tooLarge = checkBodySize(request, path)
            if (tooLarge) return tooLarge

            const csrf = checkOrigin(request)
            if (csrf) return csrf
        }

        // Let API handlers perform authenticated token validation directly
        applySecurityHeaders(response)
        return response;
    }

    // 3. User Session Resolution for Pages (Only when navigating UI pages)
    try {
        if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
            const hasAuthCookie = request.cookies.getAll().some(c => 
                c.name.startsWith('sb-') || c.name.includes('auth-token') || c.name === 'app_token'
            );

            if (hasAuthCookie || isAuthPage) {
                const supabase = createServerClient(
                    process.env.NEXT_PUBLIC_SUPABASE_URL,
                    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
                    {
                        cookies: {
                            getAll() {
                                return request.cookies.getAll()
                            },
                            setAll(cookiesToSet) {
                                cookiesToSet.forEach(({ name, value }) =>
                                    request.cookies.set(name, value)
                                )
                                response = NextResponse.next({
                                    request,
                                })
                                cookiesToSet.forEach(({ name, value, options }) =>
                                    response.cookies.set(name, value, options)
                                )
                            },
                        },
                    }
                );
                const { data } = await supabase.auth.getUser();
                user = data?.user ?? null;
            }
        }
    } catch (e) {
        console.error('[Middleware Auth Exception]', e);
    }

    // 4. Handle Unauthenticated Users for UI Pages
    if (!user) {
        if (isAdminPage || isDashboardPage || path.startsWith('/exam')) {
            url.pathname = '/login'
            return NextResponse.redirect(url)
        }
    } else {
        // A Supabase session alone is not a completed sign-in. Dashboard and admin pages also need the
        // device session this server issues after the full sign-in; this catches partial-page requests
        // that skip the layout check.
        if (isAdminPage || isDashboardPage || path.startsWith('/exam')) {
            const session = request.cookies.get('lucy_device_session')?.value
            const mark = request.cookies.get(DEVICE_MARK_COOKIE)?.value
            if (!(await isValidDeviceMark(user.id, session, mark))) {
                // A legacy device cookie with no mark is upgraded once by /auth/upgrade (which checks it against the database).
                if (session && !mark && request.method === 'GET' && Date.now() < LEGACY_UPGRADE_UNTIL) {
                    const back = `${path}${request.nextUrl.search}`
                    url.pathname = '/auth/upgrade'
                    url.search = `?next=${encodeURIComponent(back)}`
                    return NextResponse.redirect(url)
                }
                url.pathname = '/logout'
                url.search = '?reason=session'
                return NextResponse.redirect(url)
            }
        }

        // 5. Handle Authenticated Users for UI Pages
        const metadataRole = user.user_metadata?.role

        if (metadataRole) {
            if (isAuthPage && !url.search) {
                const dest = metadataRole === 'SUPERADMIN' ? '/admin/dashboard' : '/dashboard'
                url.pathname = dest
                return NextResponse.redirect(url)
            }

            if (isAdminPage && metadataRole !== 'SUPERADMIN') {
                url.pathname = '/dashboard'
                return NextResponse.redirect(url)
            }
        } else if (isAuthPage && !url.search) {
            url.pathname = '/dashboard'
            return NextResponse.redirect(url)
        }
    }

    // ─────────────────────────────────────────────────
    // 5. Advanced Security Layers
    // ─────────────────────────────────────────────────

    // Page requests: CSRF check for mutating requests (e.g. server actions) and security headers
    if (isMutating(request)) {
        const csrf = checkOrigin(request)
        if (csrf) return csrf
    }

    applySecurityHeaders(response)

    // D. Performance Layers: Global Cache Control
    const isStaticAsset = path.match(/\.(css|js|woff2|png|jpg|jpeg|svg|webp|gif|ico)$/)
    
    if (isStaticAsset) {
        response.headers.set('Cache-Control', 'public, max-age=2592000, immutable') // 30 Days
    } else {
        // MUST NEVER cache authenticated routes publicly!
        response.headers.set('Cache-Control', 'private, no-cache, no-store, must-revalidate')
    }

    return response
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
