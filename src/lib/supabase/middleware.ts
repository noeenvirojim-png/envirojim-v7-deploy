
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { assert } from '@/lib/runtime-assert'

export async function updateSession(request: NextRequest) {
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
                setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
                    cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))

                    response = NextResponse.next({
                        request,
                    })

                    cookiesToSet.forEach(({ name, value, options }) =>
                        response.cookies.set(name, value, options)
                    )
                },
            },
            cookieOptions: {
                secure: process.env.NODE_ENV === 'production',
            }
        }
    )

    // 1. Refresh session guarantee
    // supabase.auth.getUser() automatically refreshes the session if it's expired
    const { data: { user }, error } = await supabase.auth.getUser()

    const { pathname } = request.nextUrl;

    // 2. Logging for production audit
    console.log(`[MIDDLEWARE] ${request.method} ${pathname} | User: ${user?.id || 'ANON'}`);

    // 3. Route Protection Logic

    // Public routes that don't need auth (but might redirect if authed)
    const isPublicRoute = pathname === '/' || pathname === '/login';
    const isProtectedRoute = pathname.startsWith('/dashboard') ||
        pathname.startsWith('/machines') ||
        pathname.startsWith('/tickets') ||
        pathname.startsWith('/users') ||
        pathname.startsWith('/admin');

    if (isProtectedRoute && !user) {
        console.log(`[MIDDLEWARE] Access denied to ${pathname}. Redirecting to /login`);
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = '/login';
        redirectUrl.searchParams.set('redirectedFrom', pathname);
        return NextResponse.redirect(redirectUrl);
    }

    if (user && isPublicRoute) {
        // If logged in, don't allow access to login page
        console.log('[MIDDLEWARE] Already authenticated. Redirecting to /dashboard');
        return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    // 4. Role-Based Access Control (RBAC) - STABILITY HARDENING
    if (user && isProtectedRoute) {
        // Fallback hierarchy for role retrieval in middleware
        const role = user.app_metadata?.role || user.user_metadata?.role || 'OPERATOR';

        // Admin-only routes (Full system management)
        const isAdminRoute = pathname.startsWith('/admin') || pathname.startsWith('/users');
        
        // V6 Strict Admin definition
        const isAdmin = ['SUPER_ADMIN', 'ENVIROJIM_ADMIN'].includes(role);

        if (isAdminRoute && !isAdmin) {
            console.warn(`[MIDDLEWARE] SECURITY ALERT: Non-Admin ${user.email} (Role: ${role}) attempted to access restricted route ${pathname}`);
            const errorUrl = new URL('/dashboard', request.url);
            errorUrl.searchParams.set('error', 'unauthorized_access');
            return NextResponse.redirect(errorUrl);
        }
    }

    // 5. Invariant Check (Lockdown)
    if (user && isProtectedRoute) {
        const role = user.app_metadata?.role || user.user_metadata?.role;
        if (!role) {
            console.error(`[MIDDLEWARE] FATAL AUTH DRIFT: User ${user.id} has no role metadata. Access may be blocked by RLS.`);
            // Note: We don't force logout here to allow the auto-repair bridge in the app to try and fix it
        }
    }

    return response
}
