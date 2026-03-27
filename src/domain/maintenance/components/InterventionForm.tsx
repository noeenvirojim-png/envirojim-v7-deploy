'use client'

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createInterventionReport } from '@/domain/maintenance/actions/interventions';
import { Machine, PartCatalogItem } from '@/types/schema';
import { AlertCircle, Plus, Trash2 } from 'lucide-react';

interface InterventionFormProps {
    machines: Machine[];
    parts: PartCatalogItem[];
}

export default function InterventionForm({ machines, parts }: InterventionFormProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const [machineId, setMachineId] = useState('');
    const [workDescription, setWorkDescription] = useState('');
    const [isCompleted, setIsCompleted] = useState(true);
    const [partsUsed, setPartsUsed] = useState<{ partId: string; quantity: number }[]>([]);

    const addPartRow = () => {
        setPartsUsed([...partsUsed, { partId: '', quantity: 1 }]);
    };

    const removePartRow = (index: number) => {
        setPartsUsed(partsUsed.filter((_, i) => i !== index));
    };

    const updatePartRow = (index: number, field: 'partId' | 'quantity', value: any) => {
        const newParts = [...partsUsed];
        newParts[index] = { ...newParts[index], [field]: value };
        setPartsUsed(newParts);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(false);

        const data = {
            machineId,
            workDescription,
            isCompleted,
            partsUsed: partsUsed.filter(p => p.partId !== '')
        };

        const result = await createInterventionReport(data);

        if (result.success) {
            setSuccess(true);
            setMachineId('');
            setWorkDescription('');
            setPartsUsed([]);
        } else {
            setError(result.error || 'Une erreur est survenue');
        }
        setLoading(false);
    };

    return (
        <form onSubmit={handleSubmit} className="glass-card p-6 rounded-xl space-y-6">
            <h2 className="text-xl font-bold">Rapport d&apos;Intervention</h2>

            {error && (
                <div className="p-3 bg-red-50 text-red-600 rounded-lg flex items-center gap-2 text-sm">
                    <AlertCircle className="h-4 w-4" />
                    {error}
                </div>
            )}

            {success && (
                <div className="p-3 bg-green-50 text-green-600 rounded-lg text-sm">
                    Rapport créé avec succès !
                </div>
            )}

            <div className="space-y-2">
                <Label htmlFor="machine">Machine</Label>
                <select
                    id="machine"
                    required
                    value={machineId}
                    onChange={(e) => setMachineId(e.target.value)}
                    className="w-full h-10 px-3 rounded-md border border-slate-200 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-primary"
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
                <Label htmlFor="description">Description des travaux</Label>
                <textarea
                    id="description"
                    required
                    value={workDescription}
                    onChange={(e) => setWorkDescription(e.target.value)}
                    className="w-full min-h-[100px] p-3 rounded-md border border-slate-200 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                    placeholder="Qu'avez-vous fait sur la machine ?"
                />
            </div>

            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <Label>Pièces utilisées</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addPartRow} className="flex items-center gap-1">
                        <Plus className="h-3 w-3" /> Ajouter
                    </Button>
                </div>

                {partsUsed.map((row, index) => (
                    <div key={index} className="flex gap-2 items-end">
                        <div className="flex-1 space-y-1">
                            <select
                                value={row.partId}
                                onChange={(e) => updatePartRow(index, 'partId', e.target.value)}
                                className="w-full h-9 px-2 rounded-md border border-slate-200 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                            >
                                <option value="">Choisir une pièce</option>
                                {parts.map(p => (
                                    <option key={p.id} value={p.id}>{p.part_number} - {p.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="w-20 space-y-1">
                            <Input
                                type="number"
                                min="1"
                                value={row.quantity}
                                onChange={(e) => updatePartRow(index, 'quantity', parseInt(e.target.value))}
                                className="h-9 px-2"
                            />
                        </div>
                        <Button type="button" variant="ghost" size="sm" onClick={() => removePartRow(index)} className="text-red-500 h-9 px-2">
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                ))}
            </div>

            <div className="flex items-center gap-2">
                <input
                    type="checkbox"
                    id="completed"
                    checked={isCompleted}
                    onChange={(e) => setIsCompleted(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-brand-primary focus:ring-brand-primary"
                />
                <Label htmlFor="completed" className="text-sm cursor-pointer">Marquer comme terminé</Label>
            </div>

            <Button type="submit" variant="industrial" className="w-full" disabled={loading}>
                {loading ? 'Enregistrement...' : 'Soumettre le Rapport'}
            </Button>
        </form>
    );
}
