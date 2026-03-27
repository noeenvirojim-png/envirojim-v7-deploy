import { createServerClient } from '@supabase/ssr'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (!code) return NextResponse.redirect(`${origin}/auth/auth-code-error`)

  const cookieStore = cookies()
  const supabaseAnon = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user }, error } = await supabaseAnon.auth.exchangeCodeForSession(code)
  if (error || !user) return NextResponse.redirect(`${origin}/auth/auth-code-error`)

  const supabaseAdmin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: invitation } = await supabaseAdmin
    .from('invitations')
    .select('id, org_id, role')
    .eq('email', user.email)
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString())
    .eq('status', 'pending')
    .maybeSingle()

  if (invitation) {
    const { error: upsertError } = await supabaseAdmin.from('users').upsert({
      id: user.id,
      organization_id: invitation.org_id,
      role: invitation.role,
      email: user.email!,
      full_name: user.user_metadata?.full_name ?? user.email,
      auth_provider: user.app_metadata?.provider ?? 'oauth',
      status: 'active',
    })

    if (!upsertError) {
      await supabaseAdmin
        .from('invitations')
        .update({ accepted_at: new Date().toISOString(), status: 'accepted' })
        .eq('id', invitation.id)
    }
  } else {
    const { data: existing } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('id', user.id)
      .maybeSingle()

    if (!existing) return NextResponse.redirect(`${origin}/auth/unauthorized?reason=no_org`)
  }

  return NextResponse.redirect(`${origin}${next}`)
}
