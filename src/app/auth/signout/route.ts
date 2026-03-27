import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function POST(request: Request) {
    const supabase = createClient()

    // Sign out on the server side (invalidates session)
    const { error } = await supabase.auth.signOut()

    if (error) {
        console.error('Logout error:', error)
        // Fallback redirect even if error occurs
    }

    return redirect('/login')
}
