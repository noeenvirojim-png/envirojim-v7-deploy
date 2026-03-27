'use client';

import React, { useState } from 'react';
import { BrainCircuit, Wrench, Search, Activity, AlertCircle, CheckCircle2, FileText, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { startDiagnosticSession, DiagnosticResult } from '@/domain/diagnosis/actions/copilot';
import { toast } from 'sonner';

export default function DiagnosticHubPage() {
    const [machineId, setMachineId] = useState('');
    const [symptom, setSymptom] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [result, setResult] = useState<DiagnosticResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleRunDiagnosis = async () => {
        if (!machineId) {
            toast.error("Veuillez entrer un numéro de série ou un ID machine");
            return;
        }
        if (!symptom) {
            toast.error("Veuillez décrire le symptôme");
            return;
        }

        setIsAnalyzing(true);
        setError(null);
        setResult(null);

        try {
            const response = await startDiagnosticSession(symptom, machineId);
            if (response.success && response.result) {
                setResult(response.result);
                toast.success("Diagnostic complété avec succès");
            } else {
                setError(response.error || "L'IA n'a pas pu identifier la panne.");
                toast.error("Échec du diagnostic");
            }
        } catch (err: any) {
            setError("Erreur critique lors de la session de diagnostic.");
            toast.error("Erreur serveur");
        } finally {
            setIsAnalyzing(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto p-8 space-y-8 animate-in-up">
            {/* Legend Header */}
            <div className="bg-slate-900 text-white p-10 rounded-3xl shadow-2xl relative overflow-hidden">
                <div className="relative z-10 space-y-4">
                    <div className="inline-flex items-center px-3 py-1 bg-blue-500/20 rounded-full text-blue-400 text-xs font-bold uppercase tracking-widest border border-blue-500/30">
                        Version 7.2 Release
                    </div>
                    <h1 className="text-4xl font-black tracking-tight flex items-center gap-4">
                        <BrainCircuit className="h-10 w-10 text-blue-400" />
                        Diagnostic Copilot <span className="text-blue-400">Pro</span>
                    </h1>
                    <p className="text-slate-400 text-lg font-medium max-w-2xl">
                        Analyse intelligente basée sur l'historique de maintenance, les manuels techniques et la base de connaissances EnviroJim.
                    </p>
                </div>
                <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left: Input */}
                <Card className="lg:col-span-5 border-slate-200 rounded-3xl shadow-sm border-t-4 border-t-slate-900">
                    <CardHeader>
                        <CardTitle className="text-xl font-black text-slate-900">Analyse de Panne</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase text-slate-500">Identification de la Machine</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input 
                                    className="pl-10 h-12 rounded-xl border-slate-200 focus:ring-blue-500 font-bold"
                                    placeholder="S/N (ex: SN-A3928) ou UUID"
                                    value={machineId}
                                    onChange={(e) => setMachineId(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase text-slate-500">Description du Symptôme</label>
                            <textarea 
                                className="w-full h-32 p-4 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none font-medium placeholder:text-slate-300"
                                placeholder="Détaillez le comportement inhabituel, les codes d'erreur affichés sur l'écran machine, ou les bruits suspects..."
                                value={symptom}
                                onChange={(e) => setSymptom(e.target.value)}
                            />
                        </div>

                        <Button 
                            className="w-full h-14 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black text-lg transition-all active:scale-95 shadow-lg shadow-slate-200"
                            onClick={handleRunDiagnosis}
                            disabled={isAnalyzing}
                        >
                            {isAnalyzing ? (
                                <span className="flex items-center gap-2">
                                    <Activity className="h-5 w-5 animate-spin" />
                                    Synchronisation des Données...
                                </span>
                            ) : (
                                "Démarrer l'Analyse Expert"
                            )}
                        </Button>
                    </CardContent>
                </Card>

                {/* Right: Results / Loading / Placeholder */}
                <div className="lg:col-span-7 space-y-6">
                    {isAnalyzing && (
                        <div className="h-full flex flex-col items-center justify-center p-12 bg-white rounded-3xl border border-slate-100 shadow-inner">
                            <div className="relative">
                                <div className="w-20 h-20 border-4 border-blue-50 border-t-blue-500 rounded-full animate-spin"></div>
                                <Bot className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-8 w-8 text-blue-500" />
                            </div>
                            <div className="mt-8 text-center space-y-2">
                                <h3 className="text-xl font-bold text-slate-900">RAG Engine en action</h3>
                                <p className="text-slate-500 font-medium">Recherche dans les manuels techniques et l'historique de maintenance...</p>
                            </div>
                        </div>
                    )}

                    {!isAnalyzing && !result && !error && (
                        <div className="h-full flex flex-col items-center justify-center p-12 text-center bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl">
                            <Bot className="h-16 w-16 text-slate-200 mb-4" />
                            <h3 className="text-xl font-bold text-slate-400">En attente de données</h3>
                            <p className="max-w-xs text-slate-400 font-medium">Veuillez renseigner les informations à gauche pour lancer l'expertise.</p>
                        </div>
                    )}

                    {error && (
                        <Card className="border-rose-100 bg-rose-50/30 rounded-3xl">
                            <CardContent className="p-10 flex flex-col items-center text-center space-y-4">
                                <AlertCircle className="h-12 w-12 text-rose-500" />
                                <h3 className="text-xl font-bold text-rose-900">Échec du Diagnostic</h3>
                                <p className="text-rose-700 font-medium">{error}</p>
                            </CardContent>
                        </Card>
                    )}

                    {result && (
                        <div className="space-y-6 animate-in-up">
                            {/* main result */}
                            <Card className="border-blue-100 bg-blue-50/20 rounded-3xl overflow-hidden shadow-xl shadow-blue-500/5">
                                <CardHeader className="bg-blue-600 text-white p-6">
                                    <div className="flex justify-between items-center">
                                        <CardTitle className="text-lg font-black flex items-center gap-2 uppercase tracking-tight">
                                            <BrainCircuit className="h-5 w-5" />
                                            Verdict AI Copilot
                                        </CardTitle>
                                        <div className="px-3 py-1 bg-white/20 rounded-full text-xs font-black">
                                            Confiance: {result.confidence}%
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-8 space-y-8">
                                    <div className="space-y-3">
                                        <h4 className="text-xs font-black uppercase text-blue-600 tracking-widest">Cause Probable</h4>
                                        <p className="text-xl font-bold text-slate-900 leading-snug">
                                            {result.probableCause}
                                        </p>
                                    </div>

                                    <div className="space-y-4">
                                        <h4 className="text-xs font-black uppercase text-blue-600 tracking-widest">Plan de Réparation Suggéré</h4>
                                        <ul className="space-y-3">
                                            {result.suggestedRepair.map((step, i) => (
                                                <li key={i} className="flex gap-4 items-start">
                                                    <span className="flex-none w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-black flex items-center justify-center border border-blue-200 shadow-sm">
                                                        {i + 1}
                                                    </span>
                                                    <span className="text-slate-700 font-medium leading-tight">{step}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Parts / Resources */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <Card className="rounded-3xl border-slate-200 shadow-sm border-t-4 border-t-emerald-500">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm font-black uppercase text-slate-500 flex items-center gap-2">
                                            <Wrench className="h-4 w-4 text-emerald-500" />
                                            Pièces Requises
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-6">
                                        {result.suggested_parts.length > 0 ? (
                                            <div className="space-y-3">
                                                {result.suggested_parts.map((part, i) => (
                                                    <div key={i} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                                                        <div className="space-y-0.5">
                                                            <p className="text-xs font-black text-slate-400 leading-none">{part.number}</p>
                                                            <p className="text-sm font-bold text-slate-900">{part.name}</p>
                                                        </div>
                                                        <div className="flex flex-col items-end">
                                                             <span className="text-[10px] font-black px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded-md">REFÉRENCE RÉELLE</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-sm text-slate-400 font-medium italic">Aucune pièce spécifique identifiée.</p>
                                        )}
                                    </CardContent>
                                </Card>

                                <Card className="rounded-3xl border-slate-200 shadow-sm border-t-4 border-t-blue-400">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm font-black uppercase text-slate-500 flex items-center gap-2">
                                            <FileText className="h-4 w-4 text-blue-400" />
                                            Sources Consultées
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-6">
                                        <div className="flex flex-wrap gap-2">
                                            {result.sources.length > 0 ? result.sources.map((src, i) => (
                                                <span key={i} className="px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-bold rounded-lg border border-blue-100 shadow-sm">
                                                    {src}
                                                </span>
                                            )) : (
                                                <span className="text-sm text-slate-400 italic">Base de connaissances générale</span>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Final prompt */}
                            <div className="p-6 bg-slate-900 rounded-3xl text-white flex items-center justify-between gap-6 shadow-xl relative overflow-hidden group">
                                <div className="space-y-1 relative z-10">
                                    <h5 className="text-xs font-black uppercase text-blue-400 tracking-widest">Question de validation</h5>
                                    <p className="text-lg font-bold">{result.confirmation_prompt}</p>
                                </div>
                                <CheckCircle2 className="h-10 w-10 text-blue-500 flex-none group-hover:scale-110 transition-transform duration-500" />
                                <div className="absolute top-0 right-10 w-20 h-40 bg-blue-500/20 -skew-x-12 translate-x-full group-hover:-translate-x-full transition-all duration-1000"></div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
