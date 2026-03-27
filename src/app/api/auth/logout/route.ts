import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
    try {
        const cookieStore = cookies()
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() {
                        return cookieStore.getAll()
                    },
                    setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        )
                    },
                },
            }
        )

        const { error } = await supabase.auth.signOut()

        if (error) {
            console.error('Logout error:', error)
            return NextResponse.json(
                { error: 'Failed to sign out' },
                { status: 500 }
            )
        }

        // Success - cookies are automatically cleared via setAll
        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Unexpected logout error:', error)
        return NextResponse.json(
            { error: 'An unexpected error occurred' },
            { status: 500 }
        )
    }
}
