'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Wrench, ShieldAlert, Settings, ClipboardList, CheckSquare, Package, AlertTriangle, AlertCircle, ChevronRight, CheckCircle2, Cpu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getMachineProcedures, generateMachineKnowledge } from '@/domain/assets/actions/ai-ingestion';
import { cn } from '@/lib/utils';
import { useEffect } from 'react';

export function ProcedureEngine({ machineId }: { machineId: string }) {
    const [procedures, setProcedures] = useState<any[]>([]);
    const [activeProc, setActiveProc] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [currentStep, setCurrentStep] = useState(0);
    const [confirmedSteps, setConfirmedSteps] = useState<number[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);

    useEffect(() => {
        loadProcedures();
    }, [machineId]);

    const loadProcedures = async () => {
        setIsLoading(true);
        const data = await getMachineProcedures(machineId);
        setProcedures(data);
        setIsLoading(false);
    };

    const handleGenerate = async () => {
        setIsGenerating(true);
        await generateMachineKnowledge(machineId);
        await loadProcedures();
        setIsGenerating(false);
    };

    const toggleConfirm = (index: number) => {
        if (confirmedSteps.includes(index)) {
            setConfirmedSteps(prev => prev.filter(i => i !== index));
        } else {
            setConfirmedSteps(prev => [...prev, index]);
        }
    };

    if (activeProc) {
        const canFinish = confirmedSteps.length === activeProc.steps.length;

        return (
            <div className="max-w-4xl mx-auto space-y-6">
                 <div className="flex items-center justify-between px-4">
                    <Button variant="ghost" className="text-slate-400 font-bold" onClick={() => setActiveProc(null)}>
                        ← SEARCH PROCEDURES
                    </Button>
                    <Badge className="bg-orange-100 text-orange-700 border-none uppercase text-[10px] font-black">
                        LIVE REPAIR GUIDE
                    </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-2 space-y-6">
                        <Card className="border-slate-200 shadow-xl overflow-hidden bg-white">
                            <div className="bg-slate-900 p-4 border-b border-slate-800 flex justify-between items-center">
                                <h3 className="text-white font-black uppercase text-xs tracking-widest">{activeProc.title}</h3>
                                <div className="flex gap-1">
                                    {activeProc.steps.map((_: any, i: number) => (
                                        <div key={i} className={`h-1 w-4 rounded-full ${confirmedSteps.includes(i) ? 'bg-orange-500' : 'bg-slate-700'}`} />
                                    ))}
                                </div>
                            </div>
                                    <CardContent className="p-0">
                                        {(activeProc.ordered_steps || activeProc.steps).map((step: any, i: number) => {
                                            const isConfirmed = confirmedSteps.includes(i);
                                            return (
                                                <div key={i} className={`p-8 border-b border-slate-100 last:border-none flex gap-8 transition-all ${isConfirmed ? 'bg-orange-50/50 grayscale opacity-60' : 'bg-white'}`}>
                                                    <div className="pt-2">
                                                        <div 
                                                            onClick={() => toggleConfirm(i)}
                                                            className={`w-10 h-10 rounded-2xl border-2 flex items-center justify-center cursor-pointer transition-all shadow-sm ${isConfirmed ? 'bg-orange-600 border-orange-600 scale-90' : 'border-slate-200 bg-white hover:border-orange-500 hover:scale-105'}`}
                                                        >
                                                            {isConfirmed && <CheckCircle2 className="w-6 h-6 text-white" />}
                                                        </div>
                                                    </div>
                                                    <div className="space-y-2 flex-1">
                                                        <div className="flex items-center gap-3">
                                                            <span className="text-[10px] font-black text-slate-300">#{i+1}</span>
                                                            <h4 className={`font-black text-xl uppercase tracking-tighter ${isConfirmed ? 'text-slate-400' : 'text-slate-900'}`}>
                                                                {step.title || step.label}
                                                            </h4>
                                                        </div>
                                                        <p className={`text-base font-medium leading-relaxed ${isConfirmed ? 'text-slate-300' : 'text-slate-500'}`}>
                                                            {step.desc || step.description || step.content}
                                                        </p>
                                                        {!isConfirmed && (
                                                            <p className="text-[9px] font-black text-orange-500 uppercase tracking-widest pt-2">Technician verify & confirm above</p>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </CardContent>
                        </Card>
                        
                        {canFinish && (
                            <Button className="w-full h-20 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl shadow-2xl font-black text-2xl uppercase tracking-widest animate-in zoom-in-95" onClick={() => setActiveProc(null)}>
                                COMPLETE & LOG PROCEDURE
                            </Button>
                        )}
                    </div>

                    <div className="space-y-6">
                        <Card className="border-red-100 bg-red-50/20">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-[10px] font-black text-red-800 uppercase tracking-widest flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4" /> Safety Warnings
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                {activeProc.warnings.map((w: string, i: number) => (
                                    <div key={i} className="text-[10px] font-bold text-red-600 bg-white p-2 border border-red-100 rounded-lg">
                                        ⚠ {w}
                                    </div>
                                ))}
                            </CardContent>
                        </Card>

                        <Card className="border-slate-100 bg-slate-50/50">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                    <Wrench className="w-4 h-4" /> Required Tools
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                {activeProc.tools.map((t: string, i: number) => (
                                    <div key={i} className="text-[10px] font-medium text-slate-700 flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-slate-400" /> {t}
                                    </div>
                                ))}
                            </CardContent>
                        </Card>

                        <Card className="border-blue-100 bg-blue-50/50">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-[10px] font-black text-blue-800 uppercase tracking-widest flex items-center gap-2">
                                    <Package className="w-4 h-4" /> Parts Check
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                {activeProc.parts?.map((p: string, i: number) => (
                                    <div key={i} className="bg-white p-3 rounded-xl border border-blue-100">
                                        <p className="text-[11px] font-black text-slate-900">{p}</p>
                                        <Badge className="mt-1 bg-emerald-100 text-emerald-700 border-none text-[8px] font-black">IN CATALOG</Badge>
                                    </div>
                                )) || <p className="text-[9px] text-slate-400 p-2">No parts listed.</p>}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 max-w-5xl mx-auto">
             <div className="bg-white p-12 rounded-[3rem] border border-slate-200 shadow-xl text-center space-y-8">
                <div className="w-24 h-24 bg-orange-600 rounded-[2rem] flex items-center justify-center mx-auto shadow-2xl rotate-3">
                    <Wrench className="w-12 h-12 text-white" />
                </div>
                <div className="max-w-md mx-auto space-y-3">
                    <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tight leading-none">Procedure Engine</h2>
                    <p className="text-slate-500 font-medium">OEM-Level guidance synthesized from machine technical manuals.</p>
                </div>
                
                <div className="max-w-xl mx-auto relative group">
                    <ClipboardList className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-300 group-focus-within:text-orange-600 transition-colors" />
                    <input 
                        placeholder="Search: Replace Belt, Change Oil..."
                        className="w-full pl-16 pr-6 py-6 rounded-3xl border-2 border-slate-100 focus:border-orange-500 focus:ring-4 focus:ring-orange-100 shadow-sm text-xl font-bold transition-all outline-none"
                    />
                </div>

                {procedures.length === 0 && !isLoading && (
                    <div className="space-y-4 animate-in fade-in zoom-in-95 duration-700">
                        <div className="p-8 bg-blue-50 rounded-3xl border-2 border-dashed border-blue-200">
                            <Cpu className="w-12 h-12 text-blue-300 mx-auto mb-4" />
                            <h3 className="text-lg font-black text-blue-900 uppercase">Knowledge Base Empty</h3>
                            <p className="text-sm text-blue-600 font-bold max-w-xs mx-auto mt-2">The AI has not yet distilled procedures for this machine.</p>
                            <Button 
                                onClick={handleGenerate}
                                disabled={isGenerating}
                                className="mt-6 bg-blue-600 hover:bg-blue-700 text-white font-black h-14 px-10 rounded-2xl shadow-lg shadow-blue-200"
                            >
                                {isGenerating ? "DISTILLING MANUALS..." : "TRIGGER AI KNOWLEDGE FUSION"}
                            </Button>
                        </div>
                    </div>
                )}

                <div className="flex flex-wrap justify-center gap-4 pt-4">
                    {procedures.length > 0 && <p className="w-full text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-2">Available Procedures</p>}
                    {procedures.map(proc => (
                        <Button 
                            key={proc.id} 
                            variant="outline" 
                            className="bg-white border-slate-200 px-8 h-14 rounded-2xl font-black text-slate-900 hover:bg-orange-600 hover:text-white hover:border-orange-600 transition-all shadow-sm"
                            onClick={() => {
                                setActiveProc(proc);
                                setConfirmedSteps([]);
                            }}
                        >
                            {proc.title} <ChevronRight className="w-4 h-4 ml-3 opacity-30" />
                        </Button>
                    ))}
                </div>
             </div>
        </div>
    );
}

// V9 SUPREME BUILD
