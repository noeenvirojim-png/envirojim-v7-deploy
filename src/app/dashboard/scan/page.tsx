'use client';

import React, { useState } from 'react';
import { QRScanner } from '@/components/ui/qr-scanner';
import { useRouter } from 'next/navigation';
import { Search, Loader2 } from 'lucide-react';
import { getMachineBySerialNumber } from '@/domain/assets/actions/machine-resolvers';
// Wait, domain action to find machine by serial needed.
// For now, assume a quick fetch and redirect

export default function ScannerPage() {
    const router = useRouter();
    const [error, setError] = useState<string | null>(null);
    const [isResolving, setIsResolving] = useState(false);

    const handleScan = async (serialNumber: string) => {
        setIsResolving(true);
        setError(null);

        try {
            const result = await resolveMachineBySerialNumber(serialNumber);
            if (result.success && result.id) {
                router.push(`/dashboard/machines/${result.id}?mode=field`);
            } else {
                setError(`Aucune machine trouvée pour le N° de série : ${serialNumber}`);
                setIsResolving(false);
            }
        } catch (err) {
            setError("Erreur de connexion. Veuillez réessayer.");
            setIsResolving(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] p-4">
            <div className="mb-8 text-center">
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 mb-2">
                    Intervention Terrain
                </h1>
                <p className="text-slate-500 max-w-sm mx-auto">
                    Scannez l'équipement pour accéder instantanément à son carnet de santé (Digital Twin).
                </p>
            </div>

            {isResolving ? (
                <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl shadow-xl w-full max-w-md border border-slate-100">
                    <Loader2 className="h-12 w-12 text-blue-600 animate-spin mb-4" />
                    <p className="text-slate-600 font-medium">Recherche de l'équipement...</p>
                </div>
            ) : (
                <div className="w-full max-w-md">
                    <QRScanner onScan={handleScan} />

                    {error && (
                        <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-xl border border-red-100 text-center font-medium animate-in fade-in slide-in-from-top-2">
                            {error}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
