'use client';

import { useState } from 'react';
import { Plus, Trash2, Sparkles, Loader2, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { getPartsSuggestions, PartsSuggestionResult } from '@/domain/assets/actions/parts';
import { toast } from 'sonner';

interface PartItem {
    id: string;
    part_catalog_id?: string;
    part_number: string;
    part_name: string;
    quantity: number;
    price?: number;
}

interface PartsListProps {
    machineId?: string;
    items: PartItem[];
    onItemsChange: (items: PartItem[]) => void;
}

export function PartsList({ machineId, items, onItemsChange }: PartsListProps) {
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [suggestions, setSuggestions] = useState<PartsSuggestionResult | null>(null);

    const handleAddManual = () => {
        const newItem: PartItem = {
            id: crypto.randomUUID(),
            part_number: '',
            part_name: '',
            quantity: 1
        };
        onItemsChange([...items, newItem]);
    };

    const handleRemove = (id: string) => {
        onItemsChange(items.filter(item => item.id !== id));
    };

    const handleUpdate = (id: string, updates: Partial<PartItem>) => {
        onItemsChange(items.map(item => item.id === id ? { ...item, ...updates } : item));
    };

    const handleGetSuggestions = async () => {
        if (!machineId) {
            toast.error("Veuillez d'abord sélectionner une machine.");
            return;
        }
        if (query.trim().length < 3) {
            toast.error("Veuillez décrire plus précisément le problème ou la pièce.");
            return;
        }

        setLoading(true);
        try {
            const res = await getPartsSuggestions({ machine_id: machineId, query });
            if (res.success && res.result) {
                setSuggestions(res.result);
                toast.success("Suggestions IA générées !");
            } else {
                toast.error(res.error || "Échec de l'obtention des suggestions.");
            }
        } catch (error) {
            toast.error("Erreur technique lors de l'appel à l'IA.");
        } finally {
            setLoading(false);
        }
    };

    const addSuggestedPart = (part: any) => {
        const newItem: PartItem = {
            id: crypto.randomUUID(),
            part_catalog_id: part.part_id,
            part_number: part.number,
            part_name: part.name,
            quantity: 1
        };
        onItemsChange([...items, newItem]);
    };

    return (
        <div className="space-y-6">
            <div className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100">
                <div className="flex items-center gap-2 mb-4">
                    <Sparkles className="h-5 w-5 text-blue-600" />
                    <h3 className="font-bold text-slate-800">Assistance IA (Cross-Referencing)</h3>
                </div>
                <div className="flex gap-2">
                    <Input 
                        placeholder="Ex: Courroie alternateur grinçante ou Kit révision 1000h..." 
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className="bg-white border-blue-200 focus-visible:ring-blue-500"
                    />
                    <Button 
                        onClick={handleGetSuggestions} 
                        disabled={loading || !machineId}
                        className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200"
                    >
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Analyser"}
                    </Button>
                </div>
                
                {suggestions && (
                    <div className="mt-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                        <p className="text-sm text-slate-600 italic">"{suggestions.confirmation_prompt}"</p>
                        <div className="flex flex-wrap gap-2">
                            {suggestions.suggested_parts.map((p, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => addSuggestedPart(p)}
                                    className="flex items-center gap-2 bg-white border border-blue-200 hover:border-blue-500 hover:shadow-md transition-all p-2 rounded-xl text-left"
                                >
                                    <div className="h-8 w-8 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600 font-bold text-xs uppercase">
                                        {p.name.charAt(0)}
                                    </div>
                                    <div>
                                        <div className="text-xs font-bold text-slate-800 line-clamp-1">{p.name}</div>
                                        <div className="text-[10px] text-slate-500 font-mono italic">{p.number}</div>
                                    </div>
                                    <Plus className="h-4 w-4 text-blue-400 ml-1" />
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <div className="space-y-3">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        Liste des Pièces
                        <Badge variant="outline" className="bg-slate-50 text-slate-600 font-normal">
                             {items.length} {items.length > 1 ? 'items' : 'item'}
                        </Badge>
                    </h3>
                    <Button variant="outline" size="sm" onClick={handleAddManual} className="text-xs gap-1 border-dashed">
                        <Plus className="h-3 w-3" /> Ajouter manuellement
                    </Button>
                </div>

                {items.length === 0 ? (
                    <div className="p-12 border border-dashed rounded-2xl flex flex-col items-center justify-center text-slate-400 bg-slate-50/50">
                        <Info className="h-8 w-8 mb-2 opacity-20" />
                        <p className="text-sm italic text-center max-w-[250px]">
                            Aucune pièce ajoutée. Utilisez l'IA ou le bouton d'ajout manuel.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {items.map((item) => (
                            <div key={item.id} className="flex gap-3 items-start bg-white p-4 rounded-2xl border shadow-sm group hover:border-slate-300 transition-all animate-in slide-in-from-left-2 duration-200">
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 flex-1">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Référence</label>
                                        <Input 
                                            placeholder="Part #" 
                                            value={item.part_number}
                                            onChange={(e) => handleUpdate(item.id, { part_number: e.target.value })}
                                            className="h-9 focus-visible:ring-slate-400 bg-slate-50/50"
                                        />
                                    </div>
                                    <div className="space-y-1 md:col-span-2">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Désignation</label>
                                        <Input 
                                            placeholder="Nom de la pièce..." 
                                            value={item.part_name}
                                            onChange={(e) => handleUpdate(item.id, { part_name: e.target.value })}
                                            className="h-9 focus-visible:ring-slate-400 bg-slate-50/50"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Quantité</label>
                                        <Input 
                                            type="number" 
                                            min="1"
                                            value={item.quantity}
                                            onChange={(e) => handleUpdate(item.id, { quantity: parseInt(e.target.value) || 1 })}
                                            className="h-9 focus-visible:ring-slate-400 bg-slate-50/50 text-center font-bold"
                                        />
                                    </div>
                                </div>
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    onClick={() => handleRemove(item.id)}
                                    className="mt-5 text-slate-400 hover:text-red-500 hover:bg-red-50"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
