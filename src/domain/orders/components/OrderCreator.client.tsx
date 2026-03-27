'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
    Select, 
    SelectContent, 
    SelectItem, 
    SelectTrigger, 
    SelectValue 
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { 
    Truck, 
    Package, 
    Search, 
    Sparkles, 
    Upload, 
    CheckCircle2,
    Calendar,
    Weight,
    Maximize,
    DollarSign
} from 'lucide-react';
import { createPartOrder } from '../actions/order-management';
import { mapFuzzyPartToCatalog } from '../actions/ai-parts-mapper';

export function OrderCreator() {
    const [loading, setLoading] = useState(false);
    const [aiMapping, setAiMapping] = useState<any>(null);
    const [formData, setFormData] = useState({
        serial_number: '',
        description_fuzzy: '',
        quantity: 1,
        destination_type: 'CLIENT' as 'CLIENT' | 'STOCK',
        transport_type: 'LOCAL' as 'LOCAL' | 'US' | 'INTERNATIONAL' | 'CANADA',
        weight: '',
        dimensions: '',
        transport_price_quote: 0
    });

    const handleAiAnalyze = async () => {
        if (!formData.description_fuzzy) return;
        setLoading(true);
        const result = await mapFuzzyPartToCatalog(formData.description_fuzzy);
        setAiMapping(result);
        setLoading(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await createPartOrder({
                ...formData,
                quote_pdf_url: '#' // Placeholder
            });
            alert('Commande créée avec succès!');
            // Reset form...
        } catch (e: any) {
            alert(e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6 p-6 bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-4xl mx-auto">
            <div className="flex items-center gap-4 mb-8">
                <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-200">
                    <Package className="h-6 w-6 text-white" />
                </div>
                <div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">Nouvelle Demande de Pièces</h2>
                    <p className="text-slate-400 text-sm font-medium">Flash-Proof V7.2 - Workflow Intégré</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Machine Info */}
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label className="text-[11px] font-black uppercase text-slate-400">Numéro de Série Machine</Label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input 
                                placeholder="ex: EJ-2024-X100" 
                                className="pl-10 h-12 rounded-xl border-slate-200"
                                value={formData.serial_number}
                                onChange={e => setFormData({...formData, serial_number: e.target.value})}
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-[11px] font-black uppercase text-slate-400">Description (Fuzzy/Vague)</Label>
                        <Textarea 
                            placeholder="ex: bolt convoyeur avant droit, 12mm environ..." 
                            className="min-h-[100px] rounded-xl border-slate-200 resize-none"
                            value={formData.description_fuzzy}
                            onChange={e => setFormData({...formData, description_fuzzy: e.target.value})}
                            required
                        />
                        <Button 
                            type="button" 
                            variant="secondary"
                            className="w-full h-10 rounded-xl gap-2 font-black text-xs bg-slate-50 text-blue-600 hover:bg-slate-100 border border-blue-50"
                            onClick={handleAiAnalyze}
                            disabled={loading}
                        >
                            <Sparkles className="h-3.5 w-3.5" /> SUGGESTION IA CATALOGUE
                        </Button>
                        {aiMapping && (
                            <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100 text-[11px]">
                                <span className="font-black text-blue-700">Suggestion IA:</span> {aiMapping.reasoning}
                            </div>
                        )}
                    </div>
                </div>

                {/* Logistics Info */}
                <div className="space-y-4 bg-slate-50/50 p-6 rounded-2xl border border-dashed border-slate-200">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-[11px] font-black uppercase text-slate-400">Destination</Label>
                            <Select 
                                value={formData.destination_type}
                                onValueChange={(v: any) => setFormData({...formData, destination_type: v})}
                            >
                                <SelectTrigger className="h-11 rounded-xl border-slate-200">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl">
                                    <SelectItem value="CLIENT">CLIENT</SelectItem>
                                    <SelectItem value="STOCK">STOCK</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[11px] font-black uppercase text-slate-400">Type Transport</Label>
                            <Select 
                                value={formData.transport_type}
                                onValueChange={(v: any) => setFormData({...formData, transport_type: v})}
                            >
                                <SelectTrigger className="h-11 rounded-xl border-slate-200">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl">
                                    <SelectItem value="LOCAL">LOCAL</SelectItem>
                                    <SelectItem value="US">US</SelectItem>
                                    <SelectItem value="INTERNATIONAL">INTERNATIONAL</SelectItem>
                                    <SelectItem value="CANADA">CANADA</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-[11px] font-black uppercase text-slate-400">Poids (kg)</Label>
                            <div className="relative">
                                <Weight className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input 
                                    placeholder="2.5" 
                                    className="pl-10 h-11 rounded-xl border-slate-200"
                                    value={formData.weight}
                                    onChange={e => setFormData({...formData, weight: e.target.value})}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[11px] font-black uppercase text-slate-400">Dimensions</Label>
                            <div className="relative">
                                <Maximize className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input 
                                    placeholder="20x20x10" 
                                    className="pl-10 h-11 rounded-xl border-slate-200"
                                    value={formData.dimensions}
                                    onChange={e => setFormData({...formData, dimensions: e.target.value})}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-[11px] font-black uppercase text-slate-400">Prix Quotation Transport</Label>
                        <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input 
                                type="number" 
                                className="pl-10 h-11 rounded-xl border-slate-200"
                                value={formData.transport_price_quote}
                                onChange={e => setFormData({...formData, transport_price_quote: Number(e.target.value)})}
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <Button variant="outline" type="button" className="h-12 px-8 rounded-xl font-bold text-slate-500">
                    Annuler
                </Button>
                <Button 
                    type="submit" 
                    className="h-12 px-12 rounded-xl font-black bg-blue-600 hover:bg-blue-700 text-white shadow-xl shadow-blue-200 gap-2"
                    disabled={loading}
                >
                    {loading ? 'Création...' : (
                        <>
                            <CheckCircle2 className="h-4 w-4" /> CRÉER LA DEMANDE
                        </>
                    )}
                </Button>
            </div>
        </form>
    );
}
