'use client'

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle } from 'lucide-react';
import { createOrganizationAction, updateOrganizationAction } from '@/domain/identity/actions/organizations';
import { Organization } from '@/types/schema';

interface OrganizationFormProps {
    initialData?: Partial<Organization>;
    type: 'CLIENT' | 'DEALER';
    onSuccess?: () => void;
    onCancel?: () => void;
}

export default function OrganizationForm({ initialData, type, onSuccess, onCancel }: OrganizationFormProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [name, setName] = useState(initialData?.name || '');
    const [qbCustomerId, setQbCustomerId] = useState(initialData?.qbCustomerId || '');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const payload = {
            name,
            type,
            qbCustomerId: qbCustomerId || null,
        };

        const result = initialData?.id 
            ? await updateOrganizationAction(initialData.id, payload)
            : await createOrganizationAction(payload);

        if (result.success) {
            if (onSuccess) onSuccess();
        } else {
            setError(result.error || 'Erreur lors de l’enregistrement');
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {error && (
                <div className="p-4 bg-red-50 text-red-600 rounded-xl flex items-center gap-3 text-sm">
                    <AlertCircle className="h-5 w-5" />
                    {error}
                </div>
            )}

            <div className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="name">Nom de l&apos;Organisation</Label>
                    <Input
                        id="name"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Ex: Entreprise Martin, Dealer Nord..."
                        className="h-11 rounded-xl border-slate-200 focus:ring-blue-500/20"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="qbId">ID Client QuickBooks (Optionnel)</Label>
                    <Input
                        id="qbId"
                        value={qbCustomerId}
                        onChange={(e) => setQbCustomerId(e.target.value)}
                        placeholder="Ex: QB-10293"
                        className="h-11 rounded-xl border-slate-200 focus:ring-blue-500/20 font-mono text-sm"
                    />
                </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-slate-100">
                <Button 
                    type="button" 
                    variant="ghost" 
                    className="flex-1 rounded-xl h-11" 
                    onClick={onCancel} 
                    disabled={loading}
                >
                    Annuler
                </Button>
                <Button 
                    type="submit" 
                    className="flex-1 rounded-xl h-11 bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-200" 
                    disabled={loading}
                >
                    {loading ? 'Traitement...' : (initialData?.id ? 'Modifier' : 'Créer')}
                </Button>
            </div>
        </form>
    );
}
