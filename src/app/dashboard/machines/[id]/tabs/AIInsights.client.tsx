'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { TrendingUp, AlertCircle, Phone, Mail, FileText, LayoutList, ShieldAlert, Cpu, Database, ChevronRight, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getFailurePredictions, analyzeLocalFailurePatterns } from '@/domain/ai/SelfLearningEngine';

export function AIInsights({ machineId }: { machineId: string }) {
    const [patterns, setPatterns] = useState<any[]>([]);
    const [analyzing, setAnalyzing] = useState(false);

    useEffect(() => {
        loadData();
    }, [machineId]);

    const loadData = async () => {
        const res = await getFailurePredictions(machineId);
        setPatterns(res);
    };

    const handleRunAnalysis = async () => {
        setAnalyzing(true);
        try {
            await analyzeLocalFailurePatterns(machineId);
            await loadData();
        } finally {
            setAnalyzing(false);
        }
    };

    return (
        <div className="space-y-6 max-w-6xl mx-auto pb-20 px-4">
             <div className="grid md:grid-cols-3 gap-8">
                {/* Self-Learning Module */}
                <Card className="md:col-span-2 border-indigo-200 shadow-2xl bg-gradient-to-br from-white to-indigo-50/10 overflow-hidden">
                    <CardHeader className="bg-indigo-900 text-white p-8">
                        <div className="flex justify-between items-start">
                            <CardTitle className="flex items-center gap-3 text-2xl font-black">
                                <Cpu className="w-8 h-8 text-indigo-400" />
                                Industrial Self-Learning Engine
                            </CardTitle>
                            <Badge className="bg-indigo-700 text-indigo-100 border-none font-mono text-[9px]">V8.0-LOCAL-ONLY</Badge>
                        </div>
                        <CardDescription className="text-indigo-200 mt-2 font-medium">
                            Synthesizing local repair history to detect machine-specific failure patterns.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-8 space-y-8">
                        {patterns.length === 0 ? (
                            <div className="p-12 border-2 border-dashed border-indigo-100 rounded-3xl text-center space-y-6">
                                <Database className="w-16 h-16 text-indigo-100 mx-auto" />
                                <div className="space-y-1">
                                    <h4 className="font-bold text-slate-800 uppercase">Learning Cycle Incomplete</h4>
                                    <p className="text-sm text-slate-500 max-w-xs mx-auto">Requires at least 3 successful repairs to generate high-confidence patterns.</p>
                                </div>
                                <Button 
                                    disabled={analyzing}
                                    onClick={handleRunAnalysis}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-10 h-14 font-black transition-all"
                                >
                                    {analyzing ? "ANALYZING REPAIR HISTORY..." : "FORCE LEARNING CYCLE"}
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] mb-4">Detected Failure Patterns</h4>
                                {patterns.map((p, i) => (
                                    <div key={i} className="bg-white p-6 rounded-2xl border border-indigo-100 shadow-sm flex justify-between items-center group hover:border-indigo-400 transition-all">
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-3">
                                                <Badge className="bg-indigo-100 text-indigo-700 border-none font-bold text-[9px] h-5">{Math.round(p.confidence_score * 100)}% CONF.</Badge>
                                                <h5 className="font-black text-slate-900 uppercase tracking-tight">{p.symptom}</h5>
                                            </div>
                                            <p className="text-sm text-slate-500 font-medium">Likely Cause: <span className="text-slate-800">{p.most_common_cause}</span></p>
                                        </div>
                                        <Button variant="ghost" className="text-indigo-600 group-hover:translate-x-1 transition-transform">
                                            <ChevronRight className="w-6 h-6" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 flex items-center justify-between">
                            <div className="flex gap-4 items-center">
                                <Activity className="w-10 h-10 text-slate-300" />
                                <div className="space-y-0.5">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono line-clamp-1">Machine Isolation Guard</p>
                                    <p className="text-xs text-slate-600 font-bold uppercase tracking-tight">STRICT DATA ENCLAVE ACTIVE</p>
                                </div>
                            </div>
                            <ShieldAlert className="w-8 h-8 text-emerald-500 opacity-30" />
                        </div>
                    </CardContent>
                </Card>

                {/* Escalation Module */}
                <div className="space-y-6">
                    <Card className="border-red-100 bg-red-50/30 overflow-hidden shadow-xl">
                        <div className="bg-red-600 p-4 border-b border-red-500 text-center">
                            <AlertCircle className="w-8 h-8 text-white mx-auto mb-2" />
                            <h3 className="text-white font-black uppercase text-xs tracking-widest">Dealer Support Gateway</h3>
                        </div>
                        <CardContent className="p-8 space-y-6">
                            <p className="text-xs text-red-900 font-bold leading-relaxed text-center opacity-80">
                                Direct industrial escalation for complex issues or low-confidence AI diagnostics.
                            </p>
                            
                            <Button className="w-full bg-red-600 hover:bg-red-700 text-white rounded-2xl h-16 shadow-lg shadow-red-200 font-black flex flex-col items-center justify-center gap-0 leading-none">
                                <span className="text-[9px] uppercase tracking-tighter opacity-70 mb-1">Emergency Intervention</span>
                                <span>OPEN SUPPORT TICKET</span>
                            </Button>

                            <div className="pt-6 space-y-4 border-t border-red-100 italic">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center shadow-sm">
                                        <Phone className="w-4 h-4 text-red-600" />
                                    </div>
                                    <div className="space-y-0.5">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Dealer Direct</p>
                                        <p className="text-xs font-bold text-slate-800 leading-none">+1 (800) ENVIRO-JIM</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center shadow-sm">
                                        <Mail className="w-4 h-4 text-red-600" />
                                    </div>
                                    <div className="space-y-0.5">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Email Support</p>
                                        <p className="text-xs font-bold text-slate-800 leading-none">expert@envirojim.com</p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-slate-200 shadow-lg bg-white">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Auditable Logs</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <Button size="sm" variant="outline" className="w-full justify-start rounded-xl font-bold text-slate-600 border-slate-200 h-10">
                                <FileText className="w-4 h-4 mr-2" /> EXPORT PDF REPORT
                            </Button>
                            <Button size="sm" variant="outline" className="w-full justify-start rounded-xl font-bold text-slate-600 border-slate-200 h-10">
                                <LayoutList className="w-4 h-4 mr-2" /> DOWNLOAD JSON LOGS
                            </Button>
                        </CardContent>
                    </Card>
                </div>
             </div>
        </div>
    );
}
