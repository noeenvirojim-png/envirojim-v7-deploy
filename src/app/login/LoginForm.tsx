'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Mail, AlertCircle, Loader2, Lock } from 'lucide-react'
import { toast } from 'sonner'

const loginSchema = z.object({
    email: z.string().email('Please enter a valid business email'),
    password: z.string().min(6, 'Password must be at least 6 characters')
})

type LoginFormValues = z.infer<typeof loginSchema>

export function LoginForm() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [showEmailVerify, setShowEmailVerify] = useState(false)

    const {
        register,
        handleSubmit,
        formState: { errors }
    } = useForm<LoginFormValues>({
        resolver: zodResolver(loginSchema)
    })

    const onSubmit = async (values: LoginFormValues) => {
        setLoading(true)

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(values),
            })

            const data = await response.json()

            if (!response.ok) {
                // Email confirmation required
                if (data.error === 'Veuillez confirmer votre courriel avant de vous connecter') {
                    setShowEmailVerify(true)
                    setLoading(false)
                    return
                }
                // Network/Supabase unreachable
                if (data.code === 'NETWORK_ERROR' || response.status === 503) {
                    toast.error('Impossible de joindre le serveur — vérifie ta connexion réseau et réessaie.')
                    setLoading(false)
                    return
                }
                // Too many attempts
                if (response.status === 429) {
                    toast.error('Trop de tentatives — attends 1 minute avant de réessayer.')
                    setLoading(false)
                    return
                }
                // Standard auth error
                toast.error(data.error || 'Authentification échouée')
                setLoading(false)
                return
            }

            toast.success('Authentification réussie')
            
            // Success - hard reload for cookie sync
            window.location.href = '/dashboard'
        } catch (err: any) {
            // fetch() itself threw — ERR_FAILED, offline, etc.
            console.error('[LOGIN FORM] fetch error:', err.message)
            toast.error('Erreur réseau — impossible de contacter le serveur. Vérifie ta connexion.')
            setLoading(false)
        }
    }

    if (showEmailVerify) {
        return (
            <div className="space-y-6 animate-in fade-in zoom-in duration-300 py-4">
                <div className="rounded-full bg-blue-100 p-4 w-16 h-16 mx-auto flex items-center justify-center">
                    <Mail className="h-8 w-8 text-blue-600" />
                </div>
                <div className="text-center space-y-2">
                    <h3 className="text-lg font-semibold text-slate-900">Confirmation Required</h3>
                    <p className="text-sm text-slate-500">
                        We&apos;ve sent a verification link to your email.
                    </p>
                    <div className="rounded-md bg-blue-50 p-3 text-xs text-blue-700 mt-4">
                        Check your inbox (and spam folder) to activate your account.
                    </div>
                </div>
                <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setShowEmailVerify(false)}
                >
                    Back to Login
                </Button>
            </div>
        )
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2 text-left">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                        id="email"
                        type="email"
                        placeholder="technician@envirojim.com"
                        {...register('email')}
                        className={`h-11 pl-10 bg-slate-50/50 ${errors.email ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                        disabled={loading}
                    />
                </div>
                {errors.email && (
                    <p className="text-xs font-medium text-red-500 mt-1 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.email.message}
                    </p>
                )}
            </div>

            <div className="space-y-2 text-left">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        {...register('password')}
                        className={`h-11 pl-10 bg-slate-50/50 ${errors.password ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                        disabled={loading}
                    />
                </div>
                {errors.password && (
                    <p className="text-xs font-medium text-red-500 mt-1 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.password.message}
                    </p>
                )}
            </div>

            <Button type="submit" className="w-full" variant="industrial" disabled={loading}>
                {loading ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Authenticating...
                    </>
                ) : (
                    'Authenticate to Portal'
                )}
            </Button>
        </form>
    )
}
