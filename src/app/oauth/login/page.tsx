'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ShieldCheck, Mail, ArrowRight } from 'lucide-react';
import { Suspense } from 'react';

function OAuthOnboardingContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const token = searchParams.get('token');
    const [loading, setLoading] = useState(false);

    const handleOAuthFlow = (provider: 'google' | 'azure') => {
        setLoading(true);
        // Redirect to the onboarding handler
        router.push(`/api/auth/oauth-onboarding?token=${token}&provider=${provider}`);
    };

    if (!token) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
                <Card className="max-w-md w-full border-red-100 bg-red-50/20 p-8 text-center space-y-4">
                    <h1 className="text-2xl font-black text-red-600">Lien Invalide</h1>
                    <p className="text-slate-600">Ce lien d'invitation est manquant ou malformé. Veuillez contacter votre administrateur.</p>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4 font-sans relative overflow-hidden">
            {/* Background Decorative Elements */}
            <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600 blur-[120px] rounded-full" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600 blur-[120px] rounded-full" />
            </div>

            <Card className="max-w-xl w-full bg-white/5 backdrop-blur-2xl border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] rounded-[32px] overflow-hidden relative z-10">
                <div className="p-10 space-y-8">
                    <div className="space-y-4 text-center">
                        <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center mx-auto shadow-2xl shadow-blue-500/20 rotate-3">
                            <ShieldCheck className="w-10 h-10 text-white" />
                        </div>
                        <h1 className="text-4xl font-black text-white tracking-tight uppercase">Bienvenue sur EnviroJim V8</h1>
                        <p className="text-slate-400 text-lg font-medium">Votre accès industriel sécurisé est prêt. Choisissez votre méthode d'authentification OAuth pour activer votre compte.</p>
                    </div>

                    <div className="grid grid-cols-1 gap-4 pt-4">
                        <Button 
                            variant="outline"
                            disabled={loading}
                            onClick={() => handleOAuthFlow('google')}
                            className="h-20 bg-white hover:bg-slate-50 text-slate-900 rounded-2xl border-none shadow-xl font-black text-lg flex items-center justify-between px-8 transition-all active:scale-95 group"
                        >
                            <span className="flex items-center gap-4">
                                <img src="https://www.google.com/favicon.ico" alt="Google" className="w-6 h-6 grayscale group-hover:grayscale-0 transition-all" />
                                CONTINUER AVEC GOOGLE
                            </span>
                            <ArrowRight className="w-6 h-6 text-slate-400 group-hover:translate-x-1 transition-transform" />
                        </Button>

                        <Button 
                            variant="outline"
                            disabled={loading}
                            onClick={() => handleOAuthFlow('azure')}
                            className="h-20 bg-white hover:bg-slate-50 text-slate-900 rounded-2xl border-none shadow-xl font-black text-lg flex items-center justify-between px-8 transition-all active:scale-95 group"
                        >
                            <span className="flex items-center gap-4">
                                <img src="https://www.microsoft.com/favicon.ico" alt="Microsoft" className="w-6 h-6 grayscale group-hover:grayscale-0 transition-all" />
                                CONTINUER AVEC MICROSOFT
                            </span>
                            <ArrowRight className="w-6 h-6 text-slate-400 group-hover:translate-x-1 transition-transform" />
                        </Button>
                    </div>

                    <div className="pt-6 text-center border-t border-white/10">
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">
                            Sécurité Industrielle Garantis • V8 AI Engine Active
                        </p>
                    </div>
                </div>
            </Card>

            {loading && (
                <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm z-20 flex items-center justify-center animate-in fade-in">
                    <div className="text-center space-y-4">
                        <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto" />
                        <p className="text-white font-black uppercase tracking-widest text-xs">Authentification en cours...</p>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function OAuthOnboardingLanding() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
                <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
            </div>
        }>
            <OAuthOnboardingContent />
        </Suspense>
    );
}
