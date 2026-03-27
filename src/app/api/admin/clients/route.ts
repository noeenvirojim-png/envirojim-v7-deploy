import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const ClientSchema = z.object({
    name: z.string().min(2, 'Name is required'),
    email: z.string().email('Invalid email address'),
    metadata: z.record(z.any()).optional().default({})
})

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const validated = ClientSchema.parse(body)

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

        // 1. Get Admin User for Org Isolation
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { data: userData } = await supabase
            .from('users')
            .select('organization_id, role')
            .eq('id', user.id)
            .single()

        if (!userData || !['SUPER_ADMIN', 'ORG_ADMIN'].includes(userData.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        // 2. Insert Client
        const { data: client, error } = await supabase
            .from('clients')
            .insert({
                name: validated.name,
                email: validated.email,
                owner_org_id: userData.organization_id,
                metadata: validated.metadata
            })
            .select()
            .single()

        if (error) throw error

        return NextResponse.json({ success: true, client })
    } catch (error: any) {
        console.error('[API/CLIENTS] Error:', error)
        return NextResponse.json({ error: error.message || 'Internal Error' }, { status: 500 })
    }
}

export async function GET(request: NextRequest) {
    try {
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

        const { data: clients, error } = await supabase
            .from('clients')
            .select('*')
            .order('created_at', { ascending: false })

        if (error) throw error

        return NextResponse.json({ clients })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
