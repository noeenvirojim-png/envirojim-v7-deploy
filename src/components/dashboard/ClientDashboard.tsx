import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, Package, Truck } from 'lucide-react';
import Link from 'next/link';
import { DashboardMetrics } from '@/types/dashboard';
import { Button } from '@/components/ui/button';

interface ClientDashboardProps {
  metrics: DashboardMetrics;
}

export default function ClientDashboard({ metrics }: ClientDashboardProps) {
  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Machine Portal</h1>
        <p className="text-slate-500 mt-1">Secure access to your industrial fleet, diagnostics, and parts requests.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Link href="/dashboard/machines" className="block transition-transform hover:-translate-y-1">
          <Card className="hover:shadow-lg transition-shadow border-slate-200 bg-white shadow-sm h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-bold text-slate-600 uppercase tracking-tight">Active Fleet</CardTitle>
              <div className="p-2 bg-blue-50 rounded-lg">
                <Truck className="h-5 w-5 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-black text-slate-900">{metrics.activeMachines}</div>
              <p className="text-xs text-slate-500 mt-2 flex items-center gap-1 font-medium italic">
                <Activity className="w-3 h-3 text-emerald-500" />
                Live telemetry active
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/tickets" className="block transition-transform hover:-translate-y-1">
          <Card className="hover:shadow-lg transition-shadow border-slate-200 bg-white shadow-sm h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-bold text-slate-600 uppercase tracking-tight">Service Support</CardTitle>
              <div className="p-2 bg-amber-50 rounded-lg">
                <Activity className="h-5 w-5 text-amber-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-black text-slate-900">{metrics.openTickets}</div>
              <p className="text-xs text-slate-500 mt-2 font-medium">Pending technical resolution</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/parts" className="block transition-transform hover:-translate-y-1">
          <Card className="hover:shadow-lg transition-shadow border-slate-200 bg-white shadow-sm h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-bold text-slate-600 uppercase tracking-tight">Parts Tracking</CardTitle>
              <div className="p-2 bg-emerald-50 rounded-lg">
                <Package className="h-5 w-5 text-emerald-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-black text-slate-900">{metrics.partsAwaitingApproval}</div>
              <p className="text-xs text-slate-500 mt-2 font-medium">Requests in procurement pipeline</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Quick Action Widget */}
      <div className="rounded-2xl bg-slate-900 p-8 text-white relative overflow-hidden shadow-xl border border-slate-800">
        <div className="relative z-10 max-w-xl">
          <h3 className="text-2xl font-bold mb-2">New Machine Request?</h3>
          <p className="text-slate-400 mb-6 font-medium">Register a new asset and let our AI automatically ingest the technical manual for immediate diagnostic readiness.</p>
          <Link href="/dashboard/machines/create">
            <Button variant="outline" className="bg-transparent border-slate-700 hover:bg-slate-800 text-white gap-2 font-bold uppercase tracking-wider text-xs">
              Go to Machine Ingestion
            </Button>
          </Link>
        </div>
        <div className="absolute right-0 top-0 h-full w-1/3 bg-brand-primary/10 -skew-x-12 translate-x-1/4 pointer-events-none" />
      </div>
    </div>
  );
}
