'use client';

import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCcw, Home } from 'lucide-react';
import Link from 'next/link';

export default function DashboardError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Log the error to our diagnostic bridge
        console.error('[DASHBOARD CRASH CAPTURED]', error);
    }, [error]);

    return (
        <div className="flex items-center justify-center min-h-[60vh] p-4">
            <Card className="max-w-md w-full border-red-100 shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                <CardHeader className="bg-red-50 border-b border-red-100 text-center pb-8 pt-8">
                    <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                        <AlertTriangle className="h-8 w-8 text-red-600" />
                    </div>
                    <CardTitle className="text-xl font-bold text-red-900">
                        Incident de Rendu Détecté
                    </CardTitle>
                    <p className="text-red-700/70 text-sm mt-2">
                        Une erreur est survenue lors de l'affichage du tableau de bord.
                    </p>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                    <div className="bg-slate-50 rounded-lg p-4 font-mono text-xs text-slate-600 border border-slate-100 break-all overflow-hidden max-h-24">
                        {error.message || 'Erreur inconnue'}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Button 
                            variant="outline" 
                            className="w-full flex items-center gap-2 border-slate-200 hover:bg-slate-50"
                            onClick={() => window.location.href = '/'}
                        >
                            <Home className="h-4 w-4" /> Accueil
                        </Button>
                        <Button 
                            className="w-full bg-slate-900 hover:bg-slate-800 text-white flex items-center gap-2"
                            onClick={() => reset()}
                        >
                            <RefreshCcw className="h-4 w-4" /> Réessayer
                        </Button>
                    </div>

                    <p className="text-[10px] text-center text-slate-400 uppercase tracking-widest font-bold">
                        EnviroJim V6 Resilience System
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
