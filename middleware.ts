import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

/**
 * Next.js Edge Middleware.
 * This handles authentication redirection and security headers.
 * Cloudflare OpenNext requires Edge runtime for global request interception.
 */
export const runtime = 'experimental-edge'

const rateLimitMap = new Map<string, { count: number, resetTime: number }>();

function checkRateLimit(ip: string, path: string): boolean {
    const isAuth = path.startsWith('/api/auth/');
    const limit = isAuth ? 10 : 100; // 10 requests/min for auth, 100/min for general API
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

export async function middleware(request: NextRequest) {
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) =>
                        request.cookies.set(name, value)
                    )
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        response.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    // 1. Refresh session safely
    const { data, error: userError } = await supabase.auth.getUser()
    const user = data?.user || null

    // 2. Define protected paths
    const url = request.nextUrl.clone()
    const path = url.pathname

    const isAuthPage = path === '/login' || path === '/register'
    const isAdminPage = path.startsWith('/admin')
    const isDashboardPage = path.startsWith('/dashboard')
    const isApiPage = path.startsWith('/api')

    // ─────────────────────────────────────────────────
    // RATE LIMITING LAYER (Global Anti-DoS & Anti-Brute Force)
    // ─────────────────────────────────────────────────
    if (isApiPage) {
        const ip = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || '127.0.0.1';
        if (!checkRateLimit(ip, path)) {
            return new NextResponse(JSON.stringify({ error: "Too Many Requests" }), {
                status: 429,
                headers: { 'Content-Type': 'application/json', 'Retry-After': '60' }
            })
        }
    }

    // 3. Handle Unauthenticated Users
    if (!user) {
        if (isAdminPage || isDashboardPage) {
            url.pathname = '/login'
            return NextResponse.redirect(url)
        }

        // DEFAULT API AUTHENTICATION LOCK
        if (isApiPage && !path.startsWith('/api/auth/') && !path.startsWith('/api/webhooks/')) {
            return new NextResponse(JSON.stringify({ error: "Unauthorized" }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            })
        }
    } else {
        // 4. Handle Authenticated Users
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
        }
    }

    // ─────────────────────────────────────────────────
    // 5. Advanced Security Layers
    // ─────────────────────────────────────────────────

    const isMutatingRequest = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)

    // A. Request Size Limiting (DoS Protection)
    if (isApiPage && isMutatingRequest) {
        const contentLength = parseInt(request.headers.get('content-length') || '0')
        if (contentLength > 1024 * 1024) { // 1MB Limit
            return new NextResponse(JSON.stringify({ error: "Payload too large" }), {
                status: 413,
                headers: { 'Content-Type': 'application/json' }
            })
        }
    }

    // B. CSRF Protection (Origin Check)
    if (isMutatingRequest) {
        const origin = request.headers.get('origin')
        const host = request.headers.get('host')
        const proto = request.headers.get('x-forwarded-proto') || 'https'
        const expectedOrigin = `${proto}://${host}`

        if (origin && origin !== expectedOrigin && process.env.NODE_ENV === 'production') {
            return new NextResponse(JSON.stringify({ error: "CSRF: Origin mismatch" }), {
                status: 403,
                headers: { 'Content-Type': 'application/json' }
            })
        }
    }

    // C. Global Security Headers & Performance Hints
    const securityHeaders = {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
        'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://ajax.cloudflare.com https://static.cloudflareinsights.com https://*.cloudflare.com https://*.supabase.co; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob: https:; font-src 'self' data: https://fonts.gstatic.com https://fonts.googleapis.com; connect-src 'self' https://* wss://*; frame-src 'self' https://*; worker-src 'self' blob:;",
        'Link': `<${process.env.NEXT_PUBLIC_SUPABASE_URL}>; rel=preconnect`,
    }

    Object.entries(securityHeaders).forEach(([key, value]) => {
        response.headers.set(key, value)
    })

    // D. Performance Layers: Global Cache Control
    const isStaticAsset = path.match(/\.(css|js|woff2|png|jpg|jpeg|svg|webp|gif|ico)$/)
    
    if (isStaticAsset) {
        response.headers.set('Cache-Control', 'public, max-age=2592000, immutable') // 30 Days
    } else if (isApiPage) {
        response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
    } else {
        // Dashboard pages: SWR for perceived speed
        response.headers.set('Cache-Control', 'public, s-maxage=1, stale-while-revalidate=59')
    }

    return response
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
