'use client';

import { Suspense } from "react";
import { QuickActions } from "./components/QuickActions.client";
import { MicrophoneIA } from "@/components/ai/MicrophoneIA";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Siren, Activity, LayoutDashboard } from "lucide-react";
import { useRuntimeValidation } from "@/hooks/useRuntimeValidation";

// Note: KPIStrip, ActivityTimeline, and AlertCenter are currently server components.
// To follow the strict "no server imports in page" rule, we will use placeholders 
// or fetch their data via API if we were fully refactoring them.
// For now, we will render the structure and assume those sub-components handle their own logic.
// If they are server components, they MUST be imported by a server component, not this client one.
// The user said "Ensure the file ONLY renders a client component" for the PAGE.
// So the page will render a Client UI, which can then fetch data.

interface DashboardUIProps {
    timeline?: React.ReactNode;
    alertCenter?: React.ReactNode;
    kpiStrip?: React.ReactNode;
}

export function DashboardUI({ timeline, alertCenter, kpiStrip }: DashboardUIProps) {
    const { health } = useRuntimeValidation();

    return (
        <div className="flex flex-col gap-10 max-w-[1600px] mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/5 pb-8">
                <div>
                    <h1 className="text-4xl font-outfit font-black tracking-tighter text-white flex items-center gap-3">
                        <LayoutDashboard className="w-10 h-10 text-primary" />
                        COMMAND <span className="text-primary italic">CENTER</span>
                    </h1>
                    <p className="text-slate-400 mt-2 font-medium tracking-wide uppercase text-[10px] opacity-70">Industrial Intelligence Matrix • v8.0.1</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2.5 px-4 py-2 rounded-xl bg-primary/10 text-primary border border-primary/20 text-[10px] font-black uppercase tracking-widest shadow-[0_0_15px_rgba(37,99,235,0.2)]">
                        <div className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_8px_rgba(37,99,235,0.8)]" />
                        System Synchronized
                    </div>
                </div>
            </div>

            {/* KPI Section */}
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {kpiStrip || (
                    <div className="h-32 titan-glass rounded-2xl flex items-center justify-center text-slate-500 text-[10px] font-bold uppercase tracking-widest w-full lg:col-span-5 border-dashed">
                        Initialising Telemetry...
                    </div>
                )}
            </section>

            {/* Quick Actions */}
            <section className="space-y-4">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Quick Actions</h2>
                <QuickActions />
            </section>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
                <div className="xl:col-span-8 flex flex-col gap-8">
                    <Card className="titan-glass shadow-2xl border-white/5">
                        <CardHeader className="pb-4">
                            <CardTitle className="text-sm font-black uppercase tracking-[0.2em] flex items-center gap-3 text-slate-400">
                                <Activity className="w-5 h-5 text-primary" />
                                Fleet Dynamics <span className="text-primary italic font-normal text-xs tracking-normal normal-case opacity-50">Last 7 Sessions</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="h-[260px] flex items-center justify-center">
                            <div className="w-full h-full flex items-end gap-3 px-6 pb-6">
                                {[45, 60, 35, 80, 55, 90, 75].map((h, i) => (
                                    <div key={i} className="flex-1 bg-gradient-to-t from-primary/20 to-primary/60 rounded-xl transition-all hover:to-primary hover:shadow-[0_0_20px_rgba(37,99,235,0.4)] group relative cursor-pointer" style={{ height: `${h}%` }}>
                                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 titan-glass text-white text-[10px] font-black px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all scale-90 group-hover:scale-100 whitespace-nowrap z-10 border-white/10">
                                            {h}% LOAD
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Timeline */}
                    {timeline || (
                        <div className="h-64 bg-slate-50 rounded-xl border border-dashed border-slate-200 flex items-center justify-center text-slate-400 text-xs">
                            Timeline Loading...
                        </div>
                    )}
                </div>

                <div className="xl:col-span-4 flex flex-col gap-8">
                    <section className="space-y-3">
                        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-brand-primary animate-pulse" />
                            Voice Assistant
                        </h2>
                        <MicrophoneIA />
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 flex items-center gap-3">
                            <LayoutDashboard className="w-4 h-4 text-primary opacity-50" />
                            Diagnostic Matrix
                        </h2>
                        <div className="flex flex-col gap-3 p-5 titan-glass rounded-2xl shadow-2xl border-white/5">
                            <textarea
                                className="w-full h-28 p-4 text-sm rounded-xl border border-white/5 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:bg-slate-900/60 transition-all resize-none bg-slate-950/40 text-slate-200 placeholder:text-slate-600"
                                placeholder="Sync manual telemetry or diagnostic logs..."
                            />
                            <Button className="w-full bg-primary hover:bg-blue-500 text-white font-black uppercase tracking-widest text-[10px] h-12 rounded-xl shadow-[0_4px_12px_rgba(37,99,235,0.3)]">
                                Broadcast Update
                            </Button>
                        </div>
                    </section>

                    {/* Alert Center */}
                    {alertCenter || (
                        <div className="h-48 bg-slate-50 rounded-xl border border-dashed border-slate-200 flex items-center justify-center text-slate-400 text-xs">
                            Alerts Loading...
                        </div>
                    )}

                    <Card className="border-slate-100 shadow-sm bg-gradient-to-br from-slate-900 to-slate-800 text-white">
                        <CardHeader>
                            <CardTitle className="text-sm font-medium opacity-80 uppercase tracking-widest">System Health</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-xs opacity-70">Database Latency</span>
                                <span className="text-xs font-mono text-green-400">12ms</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-xs opacity-70">AI Engine Ready</span>
                                <span className="text-xs font-mono text-blue-400">Stable</span>
                            </div>
                            <div className="w-full bg-white/10 h-1.5 rounded-full mt-4">
                                <div className="bg-brand-primary h-full w-[98%] rounded-full shadow-[0_0_10px_#3b82f6]" />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
