'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
    PackagePlus, 
    ArrowRight, 
    CheckCircle2, 
    AlertCircle, 
    ChevronLeft,
    Send,
    Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MachineSelector } from './MachineSelector';
import { PartsList } from './PartsList';
import { Machine } from '@/types/schema';
import { createPartsRequest } from '@/domain/assets/actions/parts';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

export default function NewPartsRequestPage() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
    const [urgency, setUrgency] = useState('NORMAL');
    const [poNumber, setPoNumber] = useState('');
    const [items, setItems] = useState<any[]>([]);
    const [submitting, setSubmitting] = useState(false);

    const handleNext = () => {
        if (step === 1 && !selectedMachine) {
            toast.error("Veuillez sélectionner une machine.");
            return;
        }
        if (step === 2 && items.length === 0) {
            toast.error("Veuillez ajouter au moins une pièce.");
            return;
        }
        setStep(step + 1);
    };

    const handleBack = () => setStep(step - 1);

    const handleSubmit = async () => {
        if (!selectedMachine) return;
        setSubmitting(true);
        
        try {
            const res = await createPartsRequest({
                machine_id: selectedMachine.id,
                urgency,
                client_po_number: poNumber,
                items: items.map(i => ({
                    part_catalog_id: i.part_catalog_id,
                    part_number: i.part_number,
                    part_name: i.part_name,
                    quantity: i.quantity
                }))
            });

            if (res.success) {
                toast.success("Demande de pièces envoyée avec succès !");
                router.push('/dashboard/parts');
            } else {
                toast.error(res.error || "Une erreur est survenue lors de l'envoi.");
            }
        } catch (error) {
            toast.error("Erreur technique lors de l'envoi.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 max-w-5xl mx-auto animate-fade-in">
            <div className="flex items-center gap-4">
                <Link href="/dashboard/parts">
                    <Button variant="ghost" size="icon" className="rounded-full">
                        <ChevronLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Nouvelle Demande de Pièces</h1>
                    <p className="text-slate-500">Créez une demande assistée par IA pour votre flotte.</p>
                </div>
            </div>

            {/* Stepper */}
            <div className="flex items-center gap-4 px-2">
                {[1, 2, 3].map((s) => (
                    <div key={s} className="flex items-center gap-2">
                        <div className={cn(
                            "h-8 w-8 rounded-full flex items-center justify-center font-bold text-sm transition-all",
                            s === step ? "bg-blue-600 text-white shadow-lg shadow-blue-200 scale-110" : 
                            s < step ? "bg-green-100 text-green-600" : "bg-slate-100 text-slate-400"
                        )}>
                            {s < step ? <CheckCircle2 className="h-5 w-5" /> : s}
                        </div>
                        <span className={cn(
                            "text-sm font-medium",
                            s === step ? "text-slate-900" : "text-slate-400"
                        )}>
                            {s === 1 ? "Machine" : s === 2 ? "Pièces" : "Validation"}
                        </span>
                        {s < 3 && <div className="w-12 h-px bg-slate-200" />}
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 gap-6">
                {step === 1 && (
                    <Card className="border-none shadow-premium overflow-hidden transition-all duration-300">
                        <CardHeader className="bg-slate-50/50 border-b">
                            <CardTitle className="flex items-center gap-2">
                                <AlertCircle className="h-5 w-5 text-blue-500" />
                                Sélection de l'Actif
                            </CardTitle>
                            <CardDescription>
                                Identifiez la machine concernée pour activer le cross-referencing avec les manuels.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-8 pb-10 px-8">
                            <div className="max-w-xl mx-auto space-y-8">
                                <div className="space-y-3">
                                    <Label className="text-sm font-bold text-slate-700">Machine cible</Label>
                                    <MachineSelector 
                                        selectedMachine={selectedMachine || undefined} 
                                        onSelect={setSelectedMachine} 
                                    />
                                </div>
                                
                                {selectedMachine && (
                                    <div className="bg-blue-50/30 p-6 rounded-2xl border border-blue-100 animate-in fade-in zoom-in-95 duration-300">
                                        <div className="grid grid-cols-2 gap-6">
                                            <div>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Détails Techniques</p>
                                                <p className="font-bold text-slate-800">{selectedMachine.make} {selectedMachine.model}</p>
                                                <p className="text-sm text-slate-500">SN: {selectedMachine.serial_number}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Localisation</p>
                                                <p className="font-bold text-slate-800">{selectedMachine.city || 'Non spécifié'}</p>
                                                <p className="text-sm text-slate-500">État: {selectedMachine.state_province || 'N/A'}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="flex justify-end pt-4">
                                    <Button 
                                        onClick={handleNext} 
                                        disabled={!selectedMachine}
                                        className="gap-2 bg-slate-900 hover:bg-black text-white px-8 h-12 rounded-xl"
                                    >
                                        Suivant <ArrowRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {step === 2 && (
                    <Card className="border-none shadow-premium overflow-hidden transition-all duration-300">
                        <CardHeader className="bg-slate-50/50 border-b">
                            <CardTitle className="flex items-center gap-2">
                                <PackagePlus className="h-5 w-5 text-blue-500" />
                                Détails des Pièces Detachées
                            </CardTitle>
                            <CardDescription>
                                Listez les pièces nécessaires. L'IA analyse les manuels pour confirmer les références.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6 pb-10 px-8">
                            <PartsList 
                                machineId={selectedMachine?.id} 
                                items={items} 
                                onItemsChange={setItems} 
                            />
                            
                            <div className="flex justify-between pt-10 border-t mt-10">
                                <Button variant="ghost" onClick={handleBack} className="gap-2">
                                    Retour
                                </Button>
                                <Button 
                                    onClick={handleNext} 
                                    disabled={items.length === 0}
                                    className="gap-2 bg-slate-900 hover:bg-black text-white px-8 h-12 rounded-xl"
                                >
                                    Suivant <ArrowRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {step === 3 && (
                    <Card className="border-none shadow-premium overflow-hidden transition-all duration-300">
                        <CardHeader className="bg-slate-50/50 border-b">
                            <CardTitle>Validation & Envoi</CardTitle>
                            <CardDescription>
                                Vérifiez les informations avant de transmettre la demande au département pièces.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-8 pb-10 px-8">
                            <div className="max-w-2xl mx-auto space-y-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label className="text-xs font-bold text-slate-500 uppercase">Urgence</Label>
                                            <div className="flex gap-2">
                                                {['NORMAL', 'HIGH', 'EMERGENCY'].map((u) => (
                                                    <button
                                                        key={u}
                                                        onClick={() => setUrgency(u)}
                                                        className={cn(
                                                            "flex-1 py-3 px-2 rounded-xl border text-xs font-bold transition-all",
                                                            urgency === u ? 
                                                            (u === 'EMERGENCY' ? "bg-red-600 border-red-600 text-white shadow-lg shadow-red-200" :
                                                             u === 'HIGH' ? "bg-orange-500 border-orange-500 text-white shadow-lg shadow-orange-200" :
                                                             "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200") : 
                                                            "bg-white text-slate-600 hover:border-slate-300"
                                                        )}
                                                    >
                                                        {u === 'NORMAL' ? 'Standard' : u === 'HIGH' ? 'Haute' : 'Urgent'}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs font-bold text-slate-500 uppercase">Bon de Commande Client (Optional)</Label>
                                            <Input 
                                                placeholder="Ex: PO-2024-001" 
                                                value={poNumber}
                                                onChange={(e) => setPoNumber(e.target.value)}
                                                className="h-11 rounded-xl"
                                            />
                                        </div>
                                    </div>
                                    
                                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4">
                                        <h4 className="text-sm font-bold text-slate-700">Résumé</h4>
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-slate-500">Machine:</span>
                                                <span className="font-bold text-slate-800">{selectedMachine?.make} {selectedMachine?.model}</span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-slate-500">Total Pièces:</span>
                                                <span className="font-bold text-slate-800">{items.reduce((acc, i) => acc + i.quantity, 0)}</span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-slate-500">Urgence:</span>
                                                <Badge className={cn(
                                                    urgency === 'NORMAL' ? "bg-blue-100 text-blue-700" :
                                                    urgency === 'HIGH' ? "bg-orange-100 text-orange-700" :
                                                    "bg-red-100 text-red-700"
                                                )}>
                                                    {urgency}
                                                </Badge>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-between pt-10 border-t">
                                    <Button variant="ghost" onClick={handleBack} disabled={submitting} className="gap-2">
                                        Retour
                                    </Button>
                                    <Button 
                                        onClick={handleSubmit} 
                                        disabled={submitting}
                                        className="gap-2 bg-slate-900 hover:bg-black text-white px-10 h-12 rounded-xl shadow-xl transition-all hover:scale-105 active:scale-95"
                                    >
                                        {submitting ? (
                                            <>Envoi en cours <Loader2 className="h-4 w-4 animate-spin" /></>
                                        ) : (
                                            <>Transmettre la Demande <Send className="h-4 w-4" /></>
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}
