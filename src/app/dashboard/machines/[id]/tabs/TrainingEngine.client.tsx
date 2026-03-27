'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { GraduationCap, CheckCircle2, ShieldCheck, ChevronRight, BookOpen, UserCheck, HelpCircle, Loader2, Cpu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { getMachineTrainingModules, generateMachineKnowledge } from '@/domain/assets/actions/ai-ingestion';
import { useEffect } from 'react';

export function TrainingEngine({ machineId }: { machineId: string }) {
    const [modules, setModules] = useState<any[]>([]);
    const [activeModule, setActiveModule] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [currentStep, setCurrentStep] = useState(0);
    const [loading, setLoading] = useState(false);
    const [completed, setCompleted] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);

    useEffect(() => {
        loadModules();
    }, [machineId]);

    const loadModules = async () => {
        setIsLoading(true);
        const data = await getMachineTrainingModules(machineId);
        setModules(data);
        setIsLoading(false);
    };

    const handleGenerate = async () => {
        setIsGenerating(true);
        await generateMachineKnowledge(machineId);
        await loadModules();
        setIsGenerating(false);
    };

    const handleStartModule = (mod: any) => {
        setActiveModule(mod);
        setCurrentStep(0);
        setCompleted(false);
    };

    const handleNext = () => {
        if (currentStep < activeModule.steps.length - 1) {
            setCurrentStep(prev => prev + 1);
        } else {
            setCompleted(true);
            toast.success("Module completed successfully!");
        }
    };

    if (activeModule) {
        const steps = activeModule.ordered_steps || activeModule.steps || [];
        const step = steps[currentStep];
        if (!step) return <div className="p-10 text-center">Module integrity error. Please regenerate.</div>;
        const progress = ((currentStep + 1) / steps.length) * 100;

        return (
            <div className="max-w-4xl mx-auto space-y-6">
                <div className="flex items-center justify-between px-4">
                    <Button variant="ghost" className="text-slate-400 hover:text-slate-900" onClick={() => setActiveModule(null)}>
                        ← Back to Modules
                    </Button>
                    <Badge className="bg-emerald-100 text-emerald-700 border-none uppercase text-[10px] font-black">
                        MODULE: {activeModule.title}
                    </Badge>
                </div>

                <Card className="border-emerald-100 shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-2">
                    <div className="h-2 w-full bg-slate-100">
                        <Progress value={progress} className="h-full bg-slate-100" indicatorClassName="bg-emerald-500" />
                    </div>
                    <CardContent className="p-10 space-y-12">
                        {completed ? (
                            <div className="text-center space-y-6 py-10 animate-in zoom-in-95">
                                <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                                    <ShieldCheck className="w-10 h-10 text-emerald-600" />
                                </div>
                                <div>
                                    <h2 className="text-3xl font-black text-slate-900">Module Certifié</h2>
                                    <p className="text-slate-500 mt-2">Vous avez terminé l'initiation avec succès.</p>
                                </div>
                                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-12 h-14 font-bold" onClick={() => setActiveModule(null)}>
                                    CONTINUE TO NEXT LEVEL
                                </Button>
                            </div>
                        ) : (
                            <>
                                <div className="space-y-6">
                                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600">
                                        <span>SAFETY PROTOCOL STEP {currentStep + 1} / {activeModule.steps.length}</span>
                                        <Badge className="bg-emerald-100 text-emerald-700 border-none font-black">{activeModule.level}</Badge>
                                    </div>
                                    <h2 className="text-4xl font-black text-slate-900 leading-tight">{step.title}</h2>
                                    <p className="text-xl text-slate-600 leading-relaxed font-medium border-l-4 border-emerald-500 pl-6 py-2">{step.content}</p>
                                    
                                    <div className="bg-slate-900 rounded-3xl p-8 shadow-2xl space-y-4">
                                        <div className="flex gap-4 items-start">
                                            <div className="w-10 h-10 rounded-2xl bg-amber-500 flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/20">
                                                <ShieldCheck className="w-6 h-6 text-white" />
                                            </div>
                                            <div className="space-y-1">
                                                <h5 className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Technician Safety Hardening</h5>
                                                <p className="text-sm text-slate-300 font-bold italic">{step.safety}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-8 border-t border-slate-100">
                                    <div className="bg-emerald-600 rounded-2xl p-6 shadow-xl shadow-emerald-100 flex items-center justify-between">
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-black text-emerald-200 uppercase tracking-widest">Acknowledgment Sequence</p>
                                            <p className="text-white font-bold">Confirm step is fully executed</p>
                                        </div>
                                        <Button 
                                            className="bg-white hover:bg-emerald-50 text-emerald-700 px-10 h-16 rounded-xl shadow-lg font-black text-xl group transition-all active:scale-95"
                                            onClick={handleNext}
                                        >
                                            OUI / ACK <ChevronRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                                        </Button>
                                    </div>
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-8 max-w-5xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-end gap-4 px-4">
                <div className="space-y-1">
                    <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Machine Onboarding</h2>
                    <p className="text-sm text-slate-500 font-medium">Verify your knowledge through structured AI guidance.</p>
                </div>
                <div className="flex gap-4">
                    <Badge variant="outline" className="h-8 px-4 rounded-full border-slate-200 text-slate-500 font-bold">1/4 COMPLETE</Badge>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {modules.length === 0 && !isLoading && (
                    <Card className="col-span-full border-2 border-dashed border-slate-200 bg-slate-50/50 p-12 text-center space-y-6 rounded-[2rem]">
                        <Cpu className="w-16 h-16 text-slate-300 mx-auto" />
                        <div className="space-y-1">
                            <h3 className="text-xl font-black text-slate-900 uppercase">Training Modules Pending</h3>
                            <p className="text-slate-500 font-medium max-w-sm mx-auto">Trigger the Knowledge Fusion engine to transform technical manuals into interactive training sessions.</p>
                        </div>
                        <Button 
                            onClick={handleGenerate}
                            disabled={isGenerating}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-10 h-14 rounded-2xl font-black shadow-xl shadow-emerald-100"
                        >
                            {isGenerating ? "GENERATING CURRICULUM..." : "ACTIVATE AI ONBOARDING"}
                        </Button>
                    </Card>
                )}
                
                {modules.map(mod => (
                    <Card key={mod.id} className="border-slate-200 hover:border-emerald-500 hover:shadow-xl transition-all group cursor-pointer overflow-hidden bg-white rounded-3xl">
                        <div className="h-32 bg-slate-50 relative overflow-hidden flex items-center justify-center group-hover:bg-emerald-50 transition-colors">
                            <BookOpen className="w-12 h-12 text-slate-200 group-hover:text-emerald-200 transition-colors" />
                            <Badge className="absolute top-4 right-4 bg-white/80 backdrop-blur shadow-sm text-slate-700 border-none font-black text-[9px] uppercase tracking-widest">
                                {mod.level || 'Standard'}
                            </Badge>
                        </div>
                        <CardContent className="p-6">
                            <h3 className="font-black text-slate-900 uppercase tracking-tight leading-tight group-hover:text-emerald-700 transition-colors line-clamp-2 min-h-[3rem]">
                                {mod.title}
                            </h3>
                            <div className="flex items-center gap-2 mt-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                <Loader2 className="w-3 h-3" /> {(mod.ordered_steps || mod.steps || []).length} STEPS
                            </div>
                            <Button 
                                className="w-full mt-6 bg-slate-900 group-hover:bg-emerald-600 text-white rounded-xl h-12 font-bold transition-all shadow-md group-hover:shadow-emerald-200"
                                onClick={() => handleStartModule(mod)}
                            >
                                START TRAINING
                            </Button>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
