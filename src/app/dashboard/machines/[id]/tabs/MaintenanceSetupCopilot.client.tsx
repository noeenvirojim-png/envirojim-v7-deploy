'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { generateMaintenanceRules } from '@/domain/assets/actions/maintenance';

export function MaintenanceSetupCopilot({ machineId }: { machineId: string }) {
    const [loading, setLoading] = useState(false);
    const [completed, setCompleted] = useState(false);

    const handleSetup = async () => {
        setLoading(true);
        try {
            const res = await generateMaintenanceRules(machineId);
            if (res.success) {
                setCompleted(true);
                toast.success(`${res.count} règles de maintenance ont été générées automatiquement.`);
            } else {
                toast.error(res.error || "L'IA n'a pas pu configurer les règles.");
            }
        } catch (error) {
            toast.error("Erreur serveur lors de la configuration IA.");
        } finally {
            setLoading(false);
        }
    };

    if (completed) return null;

    return (
        <div className="p-6 bg-blue-50/50 border border-blue-100 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 animate-in fade-in zoom-in-95 duration-500">
            <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-200">
                    <Sparkles className="h-6 w-6" />
                </div>
                <div>
                    <h4 className="font-bold text-blue-900">Configuration IA disponible</h4>
                    <p className="text-xs text-blue-700 font-medium">L'IA peut scanner les manuels pour configurer automatiquement les intervalles d'entretien.</p>
                </div>
            </div>
            <Button 
                onClick={handleSetup} 
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-11 rounded-xl px-6 shadow-md"
            >
                {loading ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Scan en cours...
                    </>
                ) : (
                    <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        Lancer l'automatisation
                    </>
                )}
            </Button>
        </div>
    );
}
