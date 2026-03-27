import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')
    const provider = searchParams.get('provider') // 'google' or 'azure' (microsoft)

    if (!token || !provider) {
        return NextResponse.json({ error: 'Missing token or provider' }, { status: 400 })
    }

    const cookieStore = cookies()
    const supabase = createServerClient(
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

    // 1. Validate Token
    const { data: tokenData, error: tokenErr } = await supabase
        .from('client_oauth_tokens')
        .select('*, client:clients(*)')
        .eq('token', token)
        .eq('used', false)
        .gt('expires_at', new Date().toISOString())
        .single()

    if (tokenErr || !tokenData) {
        return NextResponse.json({ error: 'Invalid or expired invitation token' }, { status: 401 })
    }

    // 2. Store client_id in a secure cookie to recover after OAuth redirect
    cookieStore.set('onboarding_client_id', tokenData.client_id, { 
        httpOnly: true, 
        secure: process.env.NODE_ENV === 'production',
        maxAge: 600 // 10 minutes
    })
    
    // Also store token to mark as used later
    cookieStore.set('onboarding_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 600
    })

    // 3. Initiate Supabase OAuth
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_VERCEL_URL || 'http://localhost:3000'
    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: provider as any,
        options: {
            redirectTo: `${baseUrl}/api/auth/callback`,
            queryParams: {
                prompt: 'select_account'
            }
        }
    })

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.redirect(data.url)
}
