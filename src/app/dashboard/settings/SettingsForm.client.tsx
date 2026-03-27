'use client'

import { useState } from 'react';
import { User } from '@/types/schema';
import { updateProfileAction } from '@/domain/identity/actions/users';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface SettingsFormProps {
    user: any;
}

export function SettingsForm({ user }: SettingsFormProps) {
    const [fullName, setFullName] = useState(user.fullName || '');
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const result = await updateProfileAction({ fullName });
            if (result.success) {
                toast.success('Profil mis à jour');
            } else {
                toast.error(result.error || 'Erreur lors de la sauvegarde');
            }
        } catch (error) {
            toast.error('Erreur réseau');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <form onSubmit={handleSave} className="space-y-4">
            <div className="grid gap-2">
                <label className="text-sm font-black uppercase text-slate-500">Nom complet</label>
                <Input 
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="h-12 rounded-xl border-slate-200 focus:ring-blue-500 font-bold"
                    placeholder="Votre nom complet"
                    required
                />
            </div>
            <div className="grid gap-2 opacity-60">
                <label className="text-sm font-black uppercase text-slate-500">Email (Lecture seule)</label>
                <Input 
                    value={user.email}
                    disabled
                    className="h-12 rounded-xl border-slate-100 bg-slate-50 text-slate-400 font-medium cursor-not-allowed"
                />
            </div>
            <div className="grid gap-2 opacity-60">
                <label className="text-sm font-black uppercase text-slate-500">Rôle Actuel</label>
                <div className="h-12 px-4 flex items-center rounded-xl bg-slate-50 border border-slate-100 text-slate-900 font-black text-xs uppercase tracking-widest">
                    {user.role?.replace('_', ' ')}
                </div>
            </div>

            <Button 
                type="submit" 
                className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-black mt-4 shadow-lg shadow-slate-200"
                disabled={isSaving || fullName === user.fullName}
            >
                {isSaving ? "Sauvegarde en cours..." : "Enregistrer les modifications"}
            </Button>
        </form>
    );
}
