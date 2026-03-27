'use client'

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createTicket } from '@/domain/support/actions/tickets';
import { Machine } from '@/types/schema';
import { AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface TicketFormProps {
    machines: Machine[];
    onSuccess?: () => void;
    onCancel?: () => void;
}

export default function TicketForm({ machines, onSuccess, onCancel }: TicketFormProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [machineId, setMachineId] = useState('');
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [priority, setPriority] = useState<string>('NORMAL');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const result = await createTicket({
            machineId,
            title,
            description,
            priority
        });

        if (result.success) {
            if (onSuccess) onSuccess();
            router.refresh();
        } else {
            setError(result.error || 'Une erreur est survenue');
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="machine">Machine Concernée</Label>
                    <select
                        id="machine"
                        required
                        value={machineId}
                        onChange={(e) => setMachineId(e.target.value)}
                        className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all appearance-none text-sm"
                    >
                        <option value="">Sélectionner une machine</option>
                        {machines.map(m => (
                            <option key={m.id} value={m.id}>
                                {m.make} {m.model} ({m.serial_number})
                            </option>
                        ))}
                    </select>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="priority">Priorité</Label>
                    <select
                        id="priority"
                        required
                        value={priority}
                        onChange={(e) => setPriority(e.target.value)}
                        className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all appearance-none text-sm"
                    >
                        <option value="LOW">Basse</option>
                        <option value="NORMAL">Normale</option>
                        <option value="HIGH">Haute</option>
                        <option value="URGENT">Urgent (Critique)</option>
                    </select>
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="title">Objet de la demande</Label>
                <Input
                    id="title"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="h-11 rounded-xl border-slate-200 focus:ring-blue-500/20 focus:border-blue-500"
                    placeholder="Ex: Problème d'allumage moteur..."
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="description">Description détaillée</Label>
                <textarea
                    id="description"
                    required
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full min-h-[120px] p-4 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                    placeholder="Description du problème..."
                />
            </div>

            <div className="flex gap-4 pt-4 border-t border-slate-100">
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
                    className="flex-1 rounded-xl h-11 bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-200" 
                    disabled={loading}
                >
                    {loading ? 'Création...' : 'Ouvrir le Ticket'}
                </Button>
            </div>
        </form>
    );
}
