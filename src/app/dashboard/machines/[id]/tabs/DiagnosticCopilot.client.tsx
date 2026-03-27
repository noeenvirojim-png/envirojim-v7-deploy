'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BrainCircuit, Send, Loader2, AlertTriangle, CheckCircle, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { getDiagnosticAnalysis, DiagnosticResult } from '@/domain/assets/actions/diagnostics';
import { cn } from '@/lib/utils';

export function DiagnosticCopilot({ machineId }: { machineId: string }) {
    const [query, setQuery] = useState('');
    const [result, setResult] = useState<DiagnosticResult | null>(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim()) return;

        setLoading(true);
        setResult(null);
        try {
            const res = await getDiagnosticAnalysis({ machine_id: machineId, query });
            if (res.success && res.result) {
                setResult(res.result);
            } else {
                toast.error(res.error || "L'IA n'a pas pu analyser ce problème.");
            }
        } catch (error) {
            toast.error("Erreur de connexion au moteur IA.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <Card className="border-blue-200 shadow-lg bg-gradient-to-br from-white to-blue-50/30">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-blue-900">
                        <BrainCircuit className="w-6 h-6 text-blue-600" />
                        Diagnostic Intelligent (RAG)
                    </CardTitle>
                    <CardDescription>
                        Décrivez le symptôme ou le code erreur. L'IA analyse les manuels techniques et l'historique de la machine.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="flex gap-3">
                        <Input
                            placeholder="Ex: Fumée noire à l'accélération et perte de puissance..."
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            disabled={loading}
                            className="flex-1 h-12 bg-white rounded-xl border-slate-300 focus:ring-blue-500 shadow-sm"
                        />
                        <Button 
                            type="submit" 
                            disabled={loading || !query.trim()}
                            className="h-12 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md transition-all active:scale-95"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                        </Button>
                    </form>
                </CardContent>
            </Card>

            {loading && (
                <div className="flex flex-col items-center justify-center py-20 animate-pulse">
                    <div className="relative">
                        <BrainCircuit className="h-16 w-16 text-blue-400 opacity-20" />
                        <Loader2 className="h-8 w-8 text-blue-600 animate-spin absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                    </div>
                    <p className="mt-4 text-slate-500 font-medium">Consultation des manuels OEM et recherche vectorielle...</p>
                </div>
            )}

            {result && !loading && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* Analyse Globale */}
                    <Card className="bg-white border-slate-100 shadow-sm overflow-hidden">
                        <div className="bg-slate-900 p-4 flex items-center gap-2">
                             <CheckCircle className="w-4 h-4 text-emerald-400" />
                             <span className="text-[10px] font-black text-white uppercase tracking-widest">Recommandation EnviroJim</span>
                        </div>
                        <CardContent className="p-8 prose prose-slate max-w-none">
                            <p className="text-xl font-black text-blue-900 mb-4">{result.client_facing_message}</p>
                            <p className="text-slate-700 leading-relaxed text-lg font-medium">
                                {result.assessment}
                            </p>
                        </CardContent>
                    </Card>
 
                    <div className="grid md:grid-cols-2 gap-6">
                        {/* Causes Potentielles */}
                        <Card className="border-blue-100 bg-blue-50/20">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-bold flex items-center gap-2 text-blue-800 uppercase tracking-wider">
                                    <AlertTriangle className="w-4 h-4" /> Causes Identifiées
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 space-y-3">
                                {result.potential_causes.map((item, i) => (
                                    <div key={i} className="bg-white p-4 rounded-xl border border-blue-100 shadow-sm">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="text-sm font-bold text-slate-800">{item.cause}</span>
                                            <Badge className={cn(
                                                "text-[10px] font-black border-none",
                                                item.confidence > 0.7 ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"
                                            )}>
                                                {Math.round(item.confidence * 100)}% CONF.
                                            </Badge>
                                        </div>
                                        <p className="text-xs text-slate-500 italic">Preuve: {item.evidence}</p>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>

                        {/* Prochaines Étapes */}
                        <Card className="border-emerald-100 bg-emerald-50/20">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-bold flex items-center gap-2 text-emerald-800 uppercase tracking-wider">
                                    <CheckCircle className="w-4 h-4" /> Plan d'Action Suggéré
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 space-y-2">
                                {result.next_steps.map((step, i) => (
                                    <div key={i} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-emerald-100 text-sm font-bold text-slate-700">
                                        <span className="w-6 h-6 flex items-center justify-center bg-emerald-100 text-emerald-700 rounded-full text-[10px]">{i+1}</span>
                                        {step}
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    </div>
                    <div className="flex justify-center pt-4">
                        <Button variant="outline" className="rounded-full px-8 text-xs font-bold text-slate-500 hover:bg-slate-50 border-slate-200">
                            Générer un rapport de diagnostic PDF
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
