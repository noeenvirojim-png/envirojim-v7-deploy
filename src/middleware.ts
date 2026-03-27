import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PROTECTED_ROUTES = ['/dashboard', '/api/proxy']
const AUTH_TIMEOUT_MS = 4000

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname
  const isProtected = PROTECTED_ROUTES.some(p => pathname.startsWith(p))
  const res = NextResponse.next({ request: { headers: req.headers } })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return req.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            req.cookies.set(name, value)
            res.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  let user: any = null
  try {
    const result = await Promise.race([
      supabase.auth.getUser(),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), AUTH_TIMEOUT_MS))
    ])
    if (result && typeof result === 'object' && 'data' in result) {
      user = result.data.user ?? null
    }
  } catch {
    user = null
  }

  if (isProtected && !user) {
    const redirectUrl = new URL('/login', req.url)
    redirectUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(redirectUrl)
  }

  if (pathname === '/login' && user) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
