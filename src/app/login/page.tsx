'use client'

import { Logo } from '@/components/ui/Logo'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LoginForm } from './LoginForm'
import { ShieldCheck } from 'lucide-react'

export default function LoginPage() {
    return (
        <div className="min-h-screen flex flex-col md:flex-row bg-background animate-in-up">
            {/* Left Side: Brand & Visual (Hidden on mobile) */}
            <div className="hidden md:flex w-1/2 bg-slate-50 border-r border-slate-100 flex-col justify-between p-12 relative overflow-hidden">
                <div className="relative z-10">
                    <Logo size={48} />
                    <div className="mt-12 max-w-md">
                        <h1 className="text-4xl font-bold tracking-tight text-primary mb-4">
                            Master Your Machinery.
                        </h1>
                        <p className="text-lg text-slate-500 leading-relaxed text-balance">
                            EnviroJim provides enterprise-grade predictive maintenance and inventory management for the modern industrial age.
                        </p>
                    </div>
                </div>

                {/* Subtle Abstract Industrial Graphic */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[140%] h-[140%] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-200/50 via-slate-100/0 to-transparent opacity-60 pointer-events-none" />
                <div className="absolute bottom-0 right-0 w-96 h-96 bg-accent/5 rounded-full blur-3xl -translate-x-1/3 translate-y-1/3" />

                <div className="relative z-10 text-sm text-slate-400">
                    &copy; 2026 EnviroJim Industries via Antigravity.
                </div>
            </div>

            {/* Right Side: Login Form */}
            <div className="flex-1 flex items-center justify-center p-6 md:p-12 relative">
                <div className="w-full max-w-md space-y-8">
                    {/* Mobile Logo */}
                    <div className="md:hidden flex justify-center mb-8">
                        <Logo size={64} />
                    </div>

                    <div className="text-center md:text-left">
                        <h2 className="text-2xl font-semibold tracking-tight text-primary">
                            Welcome back
                        </h2>
                        <p className="text-sm text-muted-foreground mt-2">
                            Enter your credentials to access the secure portal.
                        </p>
                    </div>

                    <Card className="border-slate-100 shadow-xl shadow-slate-200/50">
                        <CardContent className="pt-6">
                            <LoginForm />
                        </CardContent>
                    </Card>

                    <div className="flex items-center justify-center gap-2 mt-8">
                        <Badge variant="outline" className="text-slate-500 bg-slate-50/50 border-slate-100 font-normal">
                            <ShieldCheck className="w-3 h-3 mr-1.5 text-emerald-500" />
                            End-to-End Encrypted
                        </Badge>
                    </div>
                </div>
            </div>
        </div>
    )
}
