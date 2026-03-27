import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { LogOut } from 'lucide-react'
import { useRouter } from 'next/navigation'

export function LogOutButton() {
    const router = useRouter()

    const handleSignOut = async () => {
        const supabase = createClient()
        await supabase.auth.signOut()
        router.refresh()
        router.push('/login')
    }

    return (
        <Button
            variant="ghost"
            className="w-full justify-start text-slate-500 hover:text-red-500 hover:bg-red-50"
            onClick={handleSignOut}
        >
            <LogOut className="mr-3 h-4 w-4" />
            Sign Out
        </Button>
    )
}
