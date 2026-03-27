import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const LoginSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters')
})

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()

        // 1. Zod Validation
        const validated = LoginSchema.safeParse(body)
        if (!validated.success) {
            return NextResponse.json(
                { error: 'Format de connexion invalide', fieldErrors: validated.error.flatten().fieldErrors },
                { status: 400 }
            )
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
                cookieOptions: {
                    secure: process.env.NODE_ENV === 'production',
                }
            }
        )

        // 2. Supabase Auth Attempt — with timeout guard
        let authData: any = null
        let authError: any = null

        try {
            const timeoutPromise = new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error('AUTH_TIMEOUT')), 8000)
            )
            const authPromise = supabase.auth.signInWithPassword({
                email: validated.data.email,
                password: validated.data.password
            })
            const result = await Promise.race([authPromise, timeoutPromise]) as any
            authData = result.data
            authError = result.error
        } catch (timeoutErr: any) {
            // Network or timeout failure — NOT a credentials error
            console.error('[AUTH] Supabase unreachable during login:', timeoutErr.message)
            return NextResponse.json(
                { error: 'Erreur de connexion réseau — réessayez dans quelques instants', code: 'NETWORK_ERROR' },
                { status: 503 }
            )
        }

        if (authError) {
            // Log the REAL error for debugging
            console.warn('[AUTH] Login failure:', {
                email: validated.data.email,
                supabase_error: authError.message,
                supabase_status: authError.status
            })

            // Map specific Supabase error codes to user-friendly messages
            let message = 'Courriel ou mot de passe invalide'
            let status = 401

            if (authError.message.includes('Email not confirmed')) {
                message = 'Veuillez confirmer votre courriel avant de vous connecter'
            } else if (authError.message.includes('too many requests')) {
                message = 'Trop de tentatives de connexion — attendez 1 minute avant de réessayer'
                status = 429
            } else if (authError.message.includes('network') || authError.status === 0) {
                message = 'Erreur de connexion réseau — réessayez dans quelques instants'
                status = 503
            }

            return NextResponse.json({ error: message }, { status })
        }

        // 3. Success
        console.log('[AUTH] Login success for:', authData.user?.email)

        return NextResponse.json({
            success: true,
            user: {
                id: authData.user?.id,
                email: authData.user?.email
            }
        })
    } catch (error: any) {
        console.error('[AUTH] Unexpected fatal error during login:', error)
        return NextResponse.json(
            { error: 'Une erreur technique est survenue' },
            { status: 500 }
        )
    }
}
