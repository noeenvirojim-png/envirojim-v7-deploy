'use client';

import React, { useState, useEffect } from 'react';
import { 
    Card, 
    CardContent, 
    CardHeader, 
    CardTitle,
    CardDescription
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
    BarChart3, 
    TrendingUp, 
    AlertCircle, 
    Download, 
    Sparkles, 
    RefreshCw, 
    Cpu, 
    Wrench, 
    Truck, 
    Package,
    ArrowUpRight,
    ArrowDownRight,
    Search
} from 'lucide-react';
import { aggregateKpis, fetchFullOperationalData } from '../actions/HistoricalDataFetcher';
import { generateAiInsights } from '../actions/InsightPredictor';
import { checkSystemAnomalies, generateAnomalyMailto } from '../actions/AlertEngine';
import { generateCsvReport, generateExecutiveSummary } from '../actions/ReportGenerator';

export default function AnalyticsDashboard() {
    const [loading, setLoading] = useState(true);
    const [kpis, setKpis] = useState<any>(null);
    const [insights, setInsights] = useState<any>(null);
    const [anomalies, setAnomalies] = useState<any[]>([]);
    const [summary, setSummary] = useState<string>('');

    const loadData = async () => {
        setLoading(true);
        try {
            const [k, i, a, s] = await Promise.all([
                aggregateKpis(),
                generateAiInsights(),
                checkSystemAnomalies(),
                generateExecutiveSummary()
            ]);
            setKpis(k);
            setInsights(i);
            setAnomalies(a);
            setSummary(s);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleExport = async () => {
        const { filename, content } = await generateCsvReport();
        const blob = new Blob([content], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
    };

    if (loading) return (
        <div className="flex h-screen items-center justify-center bg-slate-50/50">
            <div className="flex flex-col items-center gap-4">
                <RefreshCw className="h-10 w-10 text-blue-600 animate-spin" />
                <p className="font-black text-slate-400 uppercase tracking-widest text-[10px]">Chargement des données IA...</p>
            </div>
        </div>
    );

    return (
        <div className="p-8 space-y-8 bg-slate-50/50 min-h-screen">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-6">
                <div className="flex items-center gap-5">
                    <div className="p-4 bg-slate-900 rounded-3xl shadow-2xl shadow-slate-200">
                        <BarChart3 className="h-8 w-8 text-white" />
                    </div>
                    <div>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tighter">Reporting & Analytics IA</h1>
                        <div className="flex items-center gap-2 mt-1">
                            <Badge className="bg-emerald-50 text-emerald-600 border-emerald-100 rounded-lg text-[9px] font-black uppercase">Live Updates</Badge>
                            <p className="text-slate-400 font-bold text-[10px] uppercase tracking-wider">V7.2 Operational Intelligence</p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Button onClick={loadData} variant="outline" className="h-12 rounded-2xl font-black text-slate-600 hover:bg-white shadow-sm gap-2">
                        <RefreshCw className="h-4 w-4" /> ACTUALISER
                    </Button>
                    <Button onClick={handleExport} className="h-12 px-8 rounded-2xl font-black bg-blue-600 hover:bg-blue-700 text-white shadow-xl shadow-blue-200 gap-3">
                        <Download className="h-5 w-5" /> EXPORTER RAPPORT (CSV)
                    </Button>
                </div>
            </div>

            {/* Quick KPI Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KpiCard title="Machines Actives" value={kpis.machine_count} icon={Cpu} trend="+2%" trendDir="up" color="text-slate-900" />
                <KpiCard title="Maintenance Critique" value={kpis.machines_down} icon={Wrench} trend="-14%" trendDir="down" color="text-red-600" />
                <KpiCard title="Pièces en Transit" value={kpis.parts_in_transit} icon={Package} trend="+5" trendDir="up" color="text-blue-600" />
                <KpiCard title="Retards Logistiques" value={kpis.transports_delayed} icon={Truck} trend="Stable" trendDir="none" color="text-orange-600" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* AI Insights & Predictions */}
                <div className="lg:col-span-2 space-y-8">
                    <Card className="rounded-[2.5rem] border-none shadow-2xl overflow-hidden">
                        <CardHeader className="bg-slate-900 text-white p-8">
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-3">
                                        <Sparkles className="h-6 w-6 text-blue-400" />
                                        <CardTitle className="text-2xl font-black tracking-tight">Predictions & Insights Prédictifs</CardTitle>
                                    </div>
                                    <CardDescription className="text-slate-400 font-bold">Analysé par Gemini 1.5 Flash</CardDescription>
                                </div>
                                <Badge variant="outline" className="text-blue-400 border-blue-400 rounded-xl px-4 py-1 text-[10px] font-black uppercase">IA Hardened</Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="p-8 space-y-8 bg-white">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <section>
                                    <h4 className="text-[11px] font-black uppercase text-slate-400 mb-4 flex items-center gap-2">
                                        <TrendingUp className="h-3 w-3" /> Tendances Identifiées
                                    </h4>
                                    <div className="space-y-4">
                                        {insights.insights.map((i: any, idx: number) => (
                                            <div key={idx} className="p-5 rounded-3xl bg-slate-50 border border-slate-100 transition-all hover:scale-[1.02]">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="font-black text-slate-900 text-sm tracking-tight">{i.title}</span>
                                                    <Badge className={`${i.severity === 'HIGH' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'} text-[8px] font-black uppercase rounded-lg`}>{i.severity}</Badge>
                                                </div>
                                                <p className="text-xs text-slate-500 font-medium leading-relaxed">{i.description}</p>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                                <section>
                                    <h4 className="text-[11px] font-black uppercase text-slate-400 mb-4 flex items-center gap-2">
                                        <AlertCircle className="h-3 w-3" /> Risques Futurs (IA)
                                    </h4>
                                    <div className="space-y-4">
                                        {insights.predictions.map((p: any, idx: number) => (
                                            <div key={idx} className="p-5 rounded-3xl border-2 border-slate-50 bg-white shadow-sm transition-all hover:border-blue-100">
                                                <div className="text-[10px] font-black text-blue-600 uppercase mb-1">{p.probability} de probabilité</div>
                                                <div className="font-bold text-slate-800 text-sm mb-2">{p.event}</div>
                                                <div className="flex items-center gap-1.5">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                                                    <span className="text-[10px] text-slate-400 font-bold uppercase italic">Impact: {p.impact}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            </div>
                            <div className="pt-6 border-t border-slate-100">
                                <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase italic">
                                    <AlertCircle className="h-3 h-3" /> {insights.disclaimer}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Executive Summary */}
                    <Card className="rounded-[2.5rem] border-none shadow-xl bg-gradient-to-br from-white to-slate-50 overflow-hidden">
                        <CardHeader className="p-8 border-b border-slate-100">
                            <CardTitle className="text-xl font-black text-slate-900">Résumé Exécutif Opérationnel</CardTitle>
                        </CardHeader>
                        <CardContent className="p-8">
                            <div className="prose prose-slate max-w-none">
                                <p className="text-slate-600 font-medium leading-[1.8] whitespace-pre-wrap">{summary}</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Anomalies & Alerts */}
                <div className="space-y-8">
                    <Card className="rounded-[2.5rem] border-none shadow-2xl bg-white sticky top-8">
                        <CardHeader className="p-8 border-b border-slate-50">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-xl font-black text-slate-900">Signaux d'Anomalies</CardTitle>
                                <Badge className="bg-slate-100 text-slate-600 rounded-full h-8 w-8 flex items-center justify-center p-0 font-black">{anomalies.length}</Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="p-8 space-y-6">
                            {anomalies.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-slate-300">
                                    <CheckCircle2 className="h-12 w-12 mb-4 opacity-20" />
                                    <p className="font-bold uppercase tracking-widest text-xs">Aucune anomalie détectée</p>
                                </div>
                            ) : (
                                anomalies.map((a, idx) => (
                                    <div key={idx} className={`p-6 rounded-[2rem] border transition-all ${a.severity === 'CRITICAL' ? 'bg-red-50/50 border-red-100' : 'bg-orange-50/50 border-orange-100'}`}>
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className={`p-2 rounded-xl bg-white shadow-sm ${a.severity === 'CRITICAL' ? 'text-red-600' : 'text-orange-600'}`}>
                                                <AlertCircle className="h-4 w-4" />
                                            </div>
                                            <div className="font-black text-slate-900 text-sm">{a.title}</div>
                                        </div>
                                        <p className="text-[11px] text-slate-500 font-bold mb-4 leading-relaxed">{a.description}</p>
                                        <Button 
                                            onClick={async () => {
                                                const mailto = await generateAnomalyMailto(a);
                                                window.location.href = mailto;
                                            }}
                                            className="w-full h-10 rounded-xl bg-white hover:bg-slate-50 text-slate-900 font-black text-[10px] uppercase shadow-sm border border-slate-100 gap-2"
                                        >
                                            ALERTER SUPERVISEUR
                                        </Button>
                                    </div>
                                ))
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

function KpiCard({ title, value, icon: Icon, trend, trendDir, color }: any) {
    return (
        <Card className="rounded-[2rem] border-none shadow-xl bg-white hover:shadow-2xl transition-all group overflow-hidden">
            <CardContent className="p-7">
                <div className="flex items-center justify-between mb-5">
                    <div className="p-3 bg-slate-50 rounded-2xl group-hover:bg-slate-100 transition-colors">
                        <Icon className={`h-6 w-6 ${color}`} />
                    </div>
                    {trendDir !== 'none' && (
                        <div className={`flex items-center gap-1 text-[11px] font-black uppercase ${trendDir === 'up' ? 'text-emerald-500' : 'text-red-500'}`}>
                            {trendDir === 'up' ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                            {trend}
                        </div>
                    )}
                </div>
                <div className={`text-4xl font-black ${color} tracking-tighter mb-1`}>{value}</div>
                <div className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{title}</div>
            </CardContent>
        </Card>
    );
}

function CheckCircle2(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  )
}
