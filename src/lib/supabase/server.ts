import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createClient() {
    let cookieStore;
    try {
        cookieStore = cookies();
    } catch (e) {
        // Fallback for CLI/Background tasks
        return createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            { cookies: { getAll: () => [], setAll: () => {} } }
        );
    }

    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll();
                },
                setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
                    cookiesToSet.forEach(({ name, value, options }) => {
                        try {
                            cookieStore.set(name, value, options);
                        } catch (error) {}
                    });
                },
            },
            cookieOptions: {
                secure: process.env.NODE_ENV === 'production',
            }
        }
    );
}
