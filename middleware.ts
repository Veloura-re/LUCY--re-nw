import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export const runtime = 'experimental-edge'

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

    // 1. Refresh session
    const { data: { user } } = await supabase.auth.getUser()

    // 2. Define protected paths
    const url = request.nextUrl.clone()
    const path = url.pathname

    const isAuthPage = path === '/login' || path === '/register'
    const isAdminPage = path.startsWith('/admin')
    const isDashboardPage = path.startsWith('/dashboard')

    // 3. Handle Unauthenticated Users
    if (!user) {
        if (isAdminPage || isDashboardPage) {
            url.pathname = '/login'
            return NextResponse.redirect(url)
        }
        // Proceed for non-protected pages, but apply security layers below
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
            return NextResponse.redirect(url)
        }
    }

    // ─────────────────────────────────────────────────
    // 5. Advanced Security Layers
    // ─────────────────────────────────────────────────

    const isApiPage = path.startsWith('/api')
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

        // In production, enforce origin match.
        if (origin && origin !== expectedOrigin && process.env.NODE_ENV === 'production') {
            return new NextResponse(JSON.stringify({ error: "CSRF: Origin mismatch" }), {
                status: 403,
                headers: { 'Content-Type': 'application/json' }
            })
        }
    }

    // C. Global Security Headers
    const securityHeaders = {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
        'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://ajax.cloudflare.com https://static.cloudflareinsights.com https://*.cloudflare.com https://*.supabase.co; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob: https:; font-src 'self' data: https://fonts.gstatic.com https://fonts.googleapis.com; connect-src 'self' https://* wss://*; frame-src 'self' https://*; worker-src 'self' blob:;",
    }

    // Apply headers to the response
    Object.entries(securityHeaders).forEach(([key, value]) => {
        response.headers.set(key, value)
    })

    return response
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - api (API routes - generally we want these protected by code, but middleware can run too)
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
