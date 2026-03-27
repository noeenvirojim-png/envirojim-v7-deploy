'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BrainCircuit, CheckCircle2, XCircle, AlertTriangle, ArrowRight, Loader2, Play, Search, History, ShieldAlert, BookOpen, Quote } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { startGuidanceSession, advanceDiagnosticStep } from '@/domain/ai/GuidanceServices';
import { toast } from 'sonner';

export function DiagnosticEngine({ machineId }: { machineId: string }) {
    const [step, setStep] = useState<'IDLE' | 'LOADING' | 'ACTIVE' | 'FINAL' | 'ESCALATE'>('IDLE');
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [currentNode, setCurrentNode] = useState<any>(null);
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [symptom, setSymptom] = useState('');

    const handleStart = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!symptom.trim()) return;

        setLoading(true);
        try {
            const res = await startGuidanceSession(machineId, 'diagnostic', symptom);
            if (res.success) {
                setSessionId(res.session.id);
                // First step is always 'root'
                const firstRes = await advanceDiagnosticStep(res.session.id, 'YES'); // Just to trigger current node
                if (firstRes.success) {
                    setCurrentNode(firstRes.nextStep || firstRes.guidance);
                    setStep('ACTIVE');
                }
            }
        } catch (err) {
            toast.error("Failed to start diagnostic session");
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (answer: 'YES' | 'NO') => {
        if (!sessionId) return;
        setLoading(true);
        try {
            const res = await advanceDiagnosticStep(sessionId, answer);
            if (res.success) {
                setHistory(prev => [...prev, { node: currentNode, answer }]);
                if (res.isFinal) {
                    setCurrentNode({ type: 'RESULT', status: res.result, cause: res.cause });
                    setStep('FINAL');
                } else if (res.isFallback || res.nextStep) {
                    const next = res.nextStep || res.guidance;
                    if (next.confidence && next.confidence < 0.75) {
                        setStep('ESCALATE');
                    } else {
                        setCurrentNode(next);
                    }
                }
            }
        } catch (err) {
            toast.error("Error advancing diagnostic step");
        } finally {
            setLoading(false);
        }
    };

    if (step === 'IDLE') {
        return (
            <div className="space-y-6 max-w-4xl mx-auto">
                <Card className="border-blue-200 shadow-xl bg-gradient-to-br from-white to-blue-50/20 px-4 py-8">
                    <CardHeader className="text-center">
                        <div className="mx-auto w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg mb-4">
                            <BrainCircuit className="w-10 h-10 text-white" />
                        </div>
                        <CardTitle className="text-3xl font-bold text-slate-900">Advanced AI Diagnostics</CardTitle>
                        <CardDescription className="text-slate-600 max-w-md mx-auto mt-2 text-lg">
                            Interactive troubleshooting powered by OEM manuals and historical repair data.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="max-w-md mx-auto">
                        <form onSubmit={handleStart} className="space-y-4">
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input 
                                    className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-slate-100 focus:border-blue-500 focus:ring-0 shadow-sm text-lg font-medium transition-all"
                                    placeholder="Describe symptom (e.g. Engine Overheating)"
                                    value={symptom}
                                    onChange={(e) => setSymptom(e.target.value)}
                                />
                            </div>
                            <Button 
                                type="submit"
                                disabled={loading || !symptom.trim()}
                                className="w-full h-16 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl shadow-xl text-lg font-bold transition-all active:scale-95"
                            >
                                {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : "LAUNCH DIAGNOSTIC ENGINE"}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (step === 'ESCALATE') {
        return (
            <div className="max-w-2xl mx-auto py-10">
                <Card className="border-red-200 bg-red-50/30 overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                    <div className="bg-red-600 p-6 flex flex-col items-center text-center text-white">
                        <ShieldAlert className="w-16 h-16 mb-4" />
                        <h2 className="text-2xl font-black uppercase tracking-tighter">AI Confidence Threshold Reached</h2>
                        <p className="mt-2 text-red-100 font-medium opacity-90">Guidance suspended for safety. Low confidence score detected (&lt;0.75).</p>
                    </div>
                    <CardContent className="p-8 space-y-6">
                        <div className="bg-white p-6 rounded-2xl border border-red-100 shadow-sm">
                            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4">Diagnostic Session Log</h3>
                            <div className="space-y-3">
                                {history.map((h, i) => (
                                    <div key={i} className="flex gap-3 text-xs">
                                        <Badge variant="outline" className="h-5">S{i+1}</Badge>
                                        <div>
                                            <p className="font-bold text-slate-800">{h.node.instruction}</p>
                                            <p className="text-slate-500 italic">Confirmed: {h.answer}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <Button className="w-full h-16 bg-red-600 hover:bg-red-700 text-white rounded-2xl shadow-lg font-black uppercase tracking-wider">
                            TRANSFER TO HUMAN DEALER EXPERT
                        </Button>
                        <p className="text-center text-[10px] text-slate-400 font-bold uppercase tracking-widest px-8">
                            A complete diagnostic report has been shared with the support team.
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-20">
            {/* Active Step */}
            <Card className="border-blue-100 shadow-xl overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
                <div className="bg-slate-900 p-3 px-6 flex justify-between items-center">
                    <Badge className="bg-blue-600/20 text-blue-400 border-blue-500/30 font-mono text-[10px]">SESSION ID: {sessionId?.split('-')[0]}</Badge>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Live Guidance Active</span>
                    </div>
                </div>
                <CardContent className="p-10 space-y-8">
                    {currentNode && (
                        <>
                            <div className="space-y-6">
                                <div className="flex justify-between items-center border-b border-blue-50 pb-4">
                                    <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em]">Procédure de Diagnostic V8</h4>
                                    <Badge className="bg-emerald-100 text-emerald-700 border-none font-bold text-[10px]">CONFIDENCE: {currentNode.confidence_score || '0.92'}</Badge>
                                </div>
                                <h2 className="text-3xl font-black text-slate-900 leading-tight">
                                    {currentNode.instruction}
                                </h2>

                                {currentNode.citations && currentNode.citations.length > 0 && (
                                    <div className="flex flex-wrap gap-2 pt-2">
                                        {currentNode.citations.map((cite: string, i: number) => (
                                            <div key={i} className="flex items-center gap-1.5 bg-slate-100 text-slate-500 px-3 py-1 rounded-full text-[10px] font-bold border border-slate-200">
                                                <Quote className="w-3 h-3 text-blue-500" /> SOURCE: {cite}
                                            </div>
                                        ))}
                                    </div>
                                )}
                                
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-1">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Valeurs Attendues</p>
                                        <p className="text-sm font-bold text-slate-700">{currentNode.expected_values || 'N/A'}</p>
                                    </div>
                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-1">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Points d'Inspection</p>
                                        <div className="flex flex-wrap gap-1">
                                            {currentNode.inspection_points?.map((p: string, i: number) => (
                                                <span key={i} className="text-[10px] bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-600 font-medium">{p}</span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-blue-600 rounded-3xl p-8 shadow-2xl shadow-blue-200">
                                <div className="space-y-6">
                                    <div className="flex items-center gap-3 text-white/80">
                                        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-bold text-xs">?</div>
                                        <p className="text-xl font-bold text-white">{currentNode.question}</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <Button 
                                            onClick={() => handleAction('YES')}
                                            disabled={loading}
                                            className="h-20 bg-white hover:bg-blue-50 text-blue-600 rounded-2xl shadow-lg text-xl font-black flex items-center justify-center gap-3 transition-all active:scale-95"
                                        >
                                            {loading ? <Loader2 className="animate-spin" /> : <CheckCircle2 className="w-6 h-6" />}
                                            YES / ACK
                                        </Button>
                                        <Button 
                                            onClick={() => handleAction('NO')}
                                            disabled={loading}
                                            className="h-20 bg-blue-800 hover:bg-blue-900 text-white rounded-2xl shadow-lg text-xl font-black flex items-center justify-center gap-3 transition-all active:scale-95 border border-blue-400/30"
                                        >
                                            {loading ? <Loader2 className="animate-spin" /> : <XCircle className="w-6 h-6" />}
                                            NO / FAIL
                                        </Button>
                                    </div>
                                    <p className="text-center text-[9px] font-bold text-white/40 uppercase tracking-[0.3em]">
                                        Safety Confirmation Sequence Active
                                    </p>
                                </div>
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>

            {/* History Rail */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-4">
                    <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Fil d'Ariane Audit</h5>
                    {history.length === 0 ? (
                        <div className="p-8 border-2 border-dashed border-slate-200 rounded-3xl text-center text-slate-400 text-sm italic font-medium">
                            Début de la session de diagnostic...
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {history.map((h, i) => (
                                <div key={i} className="bg-white p-5 rounded-2xl border border-slate-200 flex items-center justify-between shadow-sm">
                                    <div className="flex items-center gap-4">
                                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500">
                                            {i+1}
                                        </div>
                                        <p className="text-sm font-bold text-slate-800 line-clamp-1">{h.node.instruction || h.node.question}</p>
                                    </div>
                                    <Badge className={h.answer === 'YES' ? 'bg-emerald-100 text-emerald-700 border-none' : 'bg-red-100 text-red-700 border-none'}>
                                        {h.answer}
                                    </Badge>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                
                <Card className="bg-slate-50 border-slate-200 h-fit">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-500">Système de Bord</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-1">
                            <div className="flex justify-between text-[10px] font-bold text-slate-600">
                                <span>PROGRESSION</span>
                                <span>{Math.min(history.length * 20, 100)}%</span>
                            </div>
                            <Progress value={history.length * 20} className="h-1 bg-slate-200" indicatorClassName="bg-blue-600" />
                        </div>
                        <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
                            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 tracking-tight">
                                <History className="w-3 h-3" /> DERNIÈRE ACTIVITÉ
                            </div>
                            <p className="text-[10px] font-medium text-slate-600">Diagnostic initié pour "{symptom}"</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
