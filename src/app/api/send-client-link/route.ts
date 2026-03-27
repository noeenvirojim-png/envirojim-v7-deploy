import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { randomBytes } from 'crypto'
import { sendClientOnboardingEmail } from '@/domain/clients/actions/ClientNotificationEngine'

const SendLinkSchema = z.object({
    clientId: z.string().uuid()
})

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { clientId } = SendLinkSchema.parse(body)

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

        // 1. Verify Admin
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        // 2. Fetch Client (and check ownership via RLS)
        const { data: client, error: clientErr } = await supabase
            .from('clients')
            .select('*')
            .eq('id', clientId)
            .single()

        if (clientErr || !client) {
            return NextResponse.json({ error: 'Client not found or access denied' }, { status: 404 })
        }

        // 3. Generate Token (64 char hex)
        const token = randomBytes(32).toString('hex')
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24h

        const { error: tokenErr } = await supabase
            .from('client_oauth_tokens')
            .insert({
                client_id: clientId,
                token,
                expires_at: expiresAt.toISOString()
            })

        if (tokenErr) throw tokenErr

        // 4. Send Email
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_VERCEL_URL || 'http://localhost:3000'
        const onboardingLink = `${baseUrl}/oauth/login?token=${token}`
        
        await sendClientOnboardingEmail(client.email, client.name, onboardingLink)

        // 5. Audit Log (Legacy sample file update)
        console.log(`[AUDIT] Onboarding link sent to ${client.email} (Token: ${token.substring(0, 8)}...)`)

        return NextResponse.json({ success: true, message: 'Invitation email sent' })

    } catch (error: any) {
        console.error('[API/SEND-LINK] Error:', error)
        return NextResponse.json({ error: error.message || 'Internal Error' }, { status: 500 })
    }
}
