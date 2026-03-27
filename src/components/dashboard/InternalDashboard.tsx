import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
    Activity, 
    Users, 
    Building2, 
    Box, 
    Ticket, 
    ClipboardList, 
    ShieldCheck, 
    TrendingUp,
    AlertCircle,
    Search,
    Clock,
    Zap,
    ArrowUpRight,
    Map
} from 'lucide-react';
import Link from 'next/link';
import { DashboardMetrics } from '@/types/dashboard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface InternalDashboardProps {
    metrics: DashboardMetrics;
}

export default function InternalDashboard({ metrics }: InternalDashboardProps) {
    return (
        <div className="space-y-8 animate-in fade-in duration-700 pb-20 px-6 max-w-[1600px] mx-auto pt-6">
            {/* Premium Header */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-slate-900 flex items-center gap-3">
                        <div className="bg-slate-900 text-white p-2 rounded-xl shadow-lg shadow-slate-200">
                           <Zap className="h-6 w-6" />
                        </div>
                        Command Center <span className="text-blue-600 font-extralight italic">V7.2</span>
                    </h1>
                    <p className="text-slate-500 mt-2 font-medium">Enterprise-grade monitoring for fleet and field operations.</p>
                </div>
                
                <div className="flex items-center gap-4 w-full lg:w-auto">
                    <div className="relative flex-1 lg:w-80 group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                        <Input 
                            placeholder="Recherche globale (Machines, Tickets...)" 
                            className="pl-10 h-11 rounded-2xl border-slate-200 bg-white/50 backdrop-blur-sm focus:bg-white transition-all shadow-sm"
                        />
                    </div>
                    <div className="flex items-center gap-3 bg-white p-2 px-4 rounded-2xl border border-slate-200 shadow-sm shrink-0">
                        <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">System Cloud Live</span>
                    </div>
                </div>
            </div>

            {/* Core KPI Grid */}
            <div className="grid gap-4 grid-cols-2 md:grid-cols-4 lg:grid-cols-7">
                <MetricCard 
                    label="Clients" 
                    value={metrics.clientCount} 
                    icon={Users} 
                    color="blue" 
                    href="/dashboard/clients" 
                />
                <MetricCard 
                    label="Dealers" 
                    value={metrics.dealerCount} 
                    icon={Building2} 
                    color="indigo" 
                    href="/dashboard/dealers" 
                />
                <MetricCard 
                    label="Machines" 
                    value={metrics.activeMachines} 
                    icon={Activity} 
                    color="emerald" 
                    href="/dashboard/machines" 
                />
                <MetricCard 
                    label="Tickets" 
                    value={metrics.openTickets} 
                    icon={Ticket} 
                    color="amber" 
                    href="/dashboard/tickets" 
                    alert={metrics.alerts.criticalTickets > 0}
                />
                <MetricCard 
                    label="Interventions" 
                    value={metrics.pendingWorkOrders} 
                    icon={ClipboardList} 
                    color="rose" 
                    href="/dashboard/schedule" 
                />
                <MetricCard 
                    label="Inventory" 
                    value={metrics.inventoryCount} 
                    icon={Box} 
                    color="slate" 
                    href="/dashboard/admin/parts" 
                />
                 <MetricCard 
                    label="Alerts" 
                    value={metrics.alerts.criticalTickets + metrics.alerts.overdueMaintenance} 
                    icon={AlertCircle} 
                    color="orange" 
                    href="/dashboard/diagnosis" 
                    urgent
                />
            </div>

            <div className="grid gap-8 lg:grid-cols-12 items-start">
                {/* Operations & Activity Feed */}
                <div className="lg:col-span-8 space-y-8">
                    <Card className="shadow-xl shadow-slate-100 border-none bg-white rounded-3xl overflow-hidden">
                        <CardHeader className="p-6 border-b border-slate-50 bg-slate-50/30 flex flex-row items-center justify-between">
                            <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-blue-500" />
                                Monitoring Opérationnel
                            </CardTitle>
                            <div className="flex gap-2">
                                <Badge variant="outline" className="bg-white border-slate-200 text-slate-500 text-[9px] font-bold">24H</Badge>
                                <Badge variant="outline" className="bg-blue-50 border-blue-100 text-blue-600 text-[9px] font-bold">LIVE</Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="grid md:grid-cols-2 divide-x divide-slate-100">
                                <div className="p-8 space-y-6">
                                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Prochaines Missions</h3>
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="flex gap-4 p-4 rounded-2xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                                            <div className="h-10 w-10 shrink-0 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400">
                                                <Map className="h-5 w-5" />
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-sm font-bold text-slate-900">Maintenance Caterpillar {i*100}D</p>
                                                <p className="text-[10px] text-slate-500 font-medium">Site Nord • Prévu à 14h30</p>
                                            </div>
                                            <Badge className="bg-blue-50 text-blue-600 border-none h-6 text-[9px] font-black">EN ROUTE</Badge>
                                        </div>
                                    ))}
                                </div>
                                <div className="p-8 space-y-6 bg-slate-50/20">
                                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Flux Support</h3>
                                    {[1, 2].map(i => (
                                        <div key={i} className="p-4 rounded-2xl bg-white border border-slate-100 shadow-sm space-y-3">
                                            <div className="flex justify-between items-start">
                                                <Badge className="bg-amber-50 text-amber-600 border-none text-[8px] font-bold">TICKET #{1024+i}</Badge>
                                                <span className="text-[9px] text-slate-400 font-mono">IL Y A 10M</span>
                                            </div>
                                            <p className="text-xs font-bold text-slate-800 line-clamp-1">Problème hydraulique majeur - Bras principal</p>
                                            <div className="flex items-center gap-2">
                                                <div className="h-5 w-5 rounded-full bg-slate-200 border border-white" />
                                                <span className="text-[10px] text-slate-500 font-medium italic truncate">Signalé par Client {i === 1 ? 'Martin' : 'Durand'}</span>
                                            </div>
                                        </div>
                                    ))}
                                    <Button variant="ghost" className="w-full text-[10px] font-bold text-slate-400 hover:text-blue-500 uppercase tracking-widest gap-2">
                                        Voir tout le support <ArrowUpRight className="h-3 w-3" />
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Status Sidebar */}
                <div className="lg:col-span-4 space-y-6">
                    {/* Fleet Health Widget */}
                    <Card className="rounded-3xl border-none shadow-xl bg-white overflow-hidden">
                        <CardHeader className="p-6 border-b border-slate-50">
                            <CardTitle className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                                Santé du Parc
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 space-y-6">
                            <div className="space-y-4">
                                <div className="flex items-end justify-between">
                                    <p className="text-4xl font-black text-slate-900">94<span className="text-lg text-slate-400 font-light">%</span></p>
                                    <p className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                                        <TrendingUp className="h-3 w-3" /> +2% vs/sem.
                                    </p>
                                </div>
                                <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden flex shadow-inner">
                                    <div className="bg-emerald-500 h-full w-[85%] rounded-r-full shadow-lg shadow-emerald-500/20" />
                                    <div className="bg-amber-400 h-full w-[10%] rounded-r-full" />
                                    <div className="bg-rose-500 h-full w-[5%]" />
                                </div>
                                <div className="flex justify-between text-[9px] font-bold text-slate-400 uppercase tracking-tighter pt-1">
                                    <span>85% OPTIMAL</span>
                                    <span>10% WARNING</span>
                                    <span>5% CRITICAL</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 pt-2">
                                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                                    <p className="text-[9px] font-bold text-slate-400 mb-1">DOWNTIME MOY.</p>
                                    <p className="text-xl font-bold text-slate-900">4.2h</p>
                                </div>
                                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                                    <p className="text-[9px] font-bold text-slate-400 mb-1">RÉUSSITE MINT.</p>
                                    <p className="text-xl font-bold text-slate-900">98%</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* AI Insight Premium */}
                    <Card className="rounded-3xl border-none shadow-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white overflow-hidden relative group">
                        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-125 transition-transform">
                            <Zap className="h-24 w-24" />
                        </div>
                        <CardContent className="p-8 space-y-4 relative z-10">
                            <div className="flex items-center gap-2">
                                <Badge className="bg-white/20 text-white border-none text-[8px] font-black uppercase">AI Predict</Badge>
                                <span className="h-1 w-1 rounded-full bg-white/50" />
                                <span className="text-[10px] opacity-70 font-medium italic">Analyse en cours...</span>
                            </div>
                            <h4 className="text-lg font-bold leading-tight">Optimisation Maintenance Caterpillar série D</h4>
                            <p className="text-xs opacity-80 leading-relaxed font-medium">
                                Les patterns de panne suggèrent une faiblesse sur les joints hydrauliques HP. 
                                <span className="block mt-2 font-black text-blue-200">Recommandation: Anticiper stock filtres HP (+15%).</span>
                            </p>
                            <Button className="w-full bg-white text-blue-700 hover:bg-blue-50 font-black text-xs h-11 rounded-2xl shadow-lg mt-4">
                                Appliquer la stratégie
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

function MetricCard({ label, value, icon: Icon, color, href, alert, urgent }: any) {
    const colors: any = {
        blue: "bg-blue-50 text-blue-600 border-blue-100 shadow-blue-100",
        indigo: "bg-indigo-50 text-indigo-600 border-indigo-100 shadow-indigo-100",
        emerald: "bg-emerald-50 text-emerald-600 border-emerald-100 shadow-emerald-100",
        amber: "bg-amber-50 text-amber-600 border-amber-100 shadow-amber-100",
        rose: "bg-rose-50 text-rose-600 border-rose-100 shadow-rose-100",
        slate: "bg-slate-50 text-slate-600 border-slate-100 shadow-slate-100",
        orange: "bg-orange-50 text-orange-600 border-orange-100 shadow-orange-100",
    };

    return (
        <Link href={href}>
            <div className={cn(
                "p-4 rounded-3xl bg-white border border-slate-100 shadow-sm transition-all hover:shadow-xl hover:-translate-y-1 group relative overflow-hidden",
                urgent && "bg-orange-50 border-orange-200 shadow-orange-100"
            )}>
                {alert && (
                    <div className="absolute top-2 right-2 flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-red-500 animate-ping" />
                        <span className="h-1.5 w-1.5 rounded-full bg-red-500 absolute top-0.5 right-0.5" />
                    </div>
                )}
                
                <div className={cn("h-10 w-10 rounded-2xl flex items-center justify-center mb-3 transition-colors", colors[color])}>
                    <Icon className="h-5 w-5" />
                </div>
                
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter mb-0.5 group-hover:text-slate-600 transition-colors">{label}</p>
                <div className="flex items-end justify-between">
                    <p className="text-2xl font-black text-slate-900">{value}</p>
                    <ArrowUpRight className="h-4 w-4 text-slate-200 group-hover:text-blue-500 transition-all opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0" />
                </div>
            </div>
        </Link>
    );
}
