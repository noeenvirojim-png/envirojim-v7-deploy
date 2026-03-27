'use client';

import React, { useState } from 'react';
import { TransportManagementTable } from './TransportManagementTable';
import { Button } from '@/components/ui/button';
import { 
    Truck, 
    Plus, 
    Ship, 
    Plane, 
    TrendingUp, 
    AlertCircle, 
    PackageCheck,
    BarChart3
} from 'lucide-react';

export default function TransportDashboard({ transports }: { transports: any[] }) {
    const stats = {
        total: transports.length,
        inTransit: transports.filter(t => t.status === 'IN_TRANSIT').length,
        delayed: transports.filter(t => t.status === 'DELAYED').length,
        delivered: transports.filter(t => t.status === 'DELIVERED').length
    };

    return (
        <div className="space-y-8 p-6 bg-slate-50/50 min-h-screen">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-6 pb-2">
                <div className="flex items-center gap-4">
                    <div className="p-4 bg-blue-600 rounded-3xl shadow-xl shadow-blue-200">
                        <Truck className="h-8 w-8 text-white" />
                    </div>
                    <div>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tighter">Transport & Livraison IA</h1>
                        <p className="text-slate-500 font-bold uppercase text-xs tracking-widest mt-1 opacity-70">
                            Logistics Intelligence Hub V7.2
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Button className="h-14 px-8 rounded-2xl font-black bg-blue-600 hover:bg-blue-700 text-white shadow-2xl shadow-blue-200 gap-3">
                        <Plus className="h-5 w-5" /> NOUVEAU TRANSPORT
                    </Button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard label="Total Expéditions" value={stats.total} icon={BarChart3} color="text-slate-900" bg="bg-white" />
                <StatCard label="En Route" value={stats.inTransit} icon={Ship} color="text-blue-600" bg="bg-blue-50/50" />
                <StatCard label="Retards Signalés" value={stats.delayed} icon={AlertCircle} color="text-red-600" bg="bg-red-50/50" />
                <StatCard label="Livraisons Finales" value={stats.delivered} icon={PackageCheck} color="text-emerald-600" bg="bg-emerald-50/50" />
            </div>

            {/* Main Table Section */}
            <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                    <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-blue-600" /> Flux Logistique Actuel
                    </h3>
                </div>
                <TransportManagementTable initialTransports={transports} />
            </div>
        </div>
    );
}

function StatCard({ label, value, icon: Icon, color, bg }: any) {
    return (
        <div className={`p-6 rounded-3xl border border-slate-100 shadow-sm ${bg} transition-all hover:shadow-md group`}>
            <div className="flex items-center justify-between mb-4">
                <div className={`p-2.5 rounded-2xl bg-white shadow-sm border border-slate-50 ${color}`}>
                    <Icon className="h-5 w-5" />
                </div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Temps Réel</span>
            </div>
            <div className={`text-3xl font-black ${color} tracking-tighter`}>{value}</div>
            <div className="text-sm font-bold text-slate-500 mt-1">{label}</div>
        </div>
    );
}
