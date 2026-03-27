import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Clock, AlertCircle, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { MaintenanceSetupCopilot } from './MaintenanceSetupCopilot.client';
import { WorkOrderHub } from '@/domain/maintenance/components/WorkOrderHub.client';
import { CreateWorkOrderInline } from './CreateWorkOrderInline.client';
import { enrichMaintenance } from '@/domain/maintenance/transformers';
import { executeMaintenanceFromEnriched } from '@/domain/maintenance/actions/execute-enriched-maintenance';

export async function MaintenanceTab({ machineId }: { machineId: string }) {
    const supabase = createClient();

    const [rulesRes, workOrdersRes] = await Promise.all([
        supabase
            .from('maintenance_plan_items')
            .select('*')
            .eq('machine_id', machineId)
            .order('interval_hours', { ascending: true }),
        supabase
            .from('work_orders')
            .select('*')
            .eq('machine_id', machineId)
            .order('created_at', { ascending: false })
            .limit(30),
    ]);

    const rules = (rulesRes.data ?? []).map((r: any) => ({
        ...r,
        _enriched: enrichMaintenance(r),
    }));
    const workOrders = workOrdersRes.data ?? [];
    const predictiveAlerts = rules.filter((r: any) => r.alert_level === 'WARNING' || r.alert_level === 'CRITICAL');
    const openWorkOrders = workOrders.filter((wo: any) => !['completed', 'cancelled', 'closed'].includes(wo.status?.toLowerCase()));

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Predictive Alerts */}
            {predictiveAlerts.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-4 items-center">
                    <div className="bg-amber-100 p-2 rounded-lg shrink-0">
                        <AlertCircle className="w-6 h-6 text-amber-600" />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-sm font-bold text-amber-900">
                            {predictiveAlerts.length} Predictive Alert{predictiveAlerts.length > 1 ? 's' : ''}
                        </h3>
                        <p className="text-xs text-amber-700">
                            {predictiveAlerts.map((a: any) => a.name || a.component || 'Item').join(' · ')}
                        </p>
                    </div>
                    {openWorkOrders.length > 0 && (
                        <Badge variant="outline" className="border-amber-300 text-amber-700 shrink-0">
                            {openWorkOrders.length} open WO{openWorkOrders.length > 1 ? 's' : ''}
                        </Badge>
                    )}
                </div>
            )}

            <div className="grid lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    {/* Work Orders Hub */}
                    <WorkOrderHub workOrders={workOrders} machineId={machineId} />

                    {/* New Work Order */}
                    <CreateWorkOrderInline machineId={machineId} />

                    {/* Maintenance Plan */}
                    <Card className="shadow-sm border-slate-200">
                        <CardHeader>
                            <CardTitle className="text-lg font-bold">Maintenance Plan</CardTitle>
                            <CardDescription>
                                {rules.length > 0
                                    ? `${rules.length} rule${rules.length > 1 ? 's' : ''} — intervals extracted from technical manuals.`
                                    : 'No rules yet. Use the AI copilot on the right to generate them from manuals.'}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {rules.length > 0 ? (
                                <div className="space-y-3">
                                    {rules.map((r: any) => {
                                        const alertLevel = r.alert_level?.toUpperCase();
                                        const isAlert = alertLevel === 'WARNING' || alertLevel === 'CRITICAL';
                                        return (
                                            <div key={r.id} className={`flex items-center justify-between p-4 border rounded-xl ${isAlert ? 'bg-amber-50 border-amber-200' : 'bg-slate-50/50 border-slate-100'}`}>
                                                <div className="flex items-center gap-3">
                                                    <div className={`p-2 rounded-lg border ${isAlert ? 'bg-amber-100 border-amber-200' : 'bg-white border-slate-200'}`}>
                                                        <Clock className={`h-4 w-4 ${isAlert ? 'text-amber-600' : 'text-slate-500'}`} />
                                                    </div>
                                                    <div>
                                                        <h4 className="text-sm font-bold text-slate-800">
                                                            {r.name || r.component || 'Maintenance Item'}
                                                        </h4>
                                                        <span className="text-[10px] text-slate-500 uppercase font-black tracking-wider">
                                                            Every {r.interval_hours || r.interval_value || '?'} hours
                                                            {r.last_done_hours != null && ` · Last: ${r.last_done_hours}h`}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {isAlert && (
                                                        <Badge variant="outline" className={alertLevel === 'CRITICAL' ? 'border-red-300 text-red-700 bg-red-50' : 'border-amber-300 text-amber-700 bg-amber-50'}>
                                                            {alertLevel}
                                                        </Badge>
                                                    )}
                                                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-100">
                                                        Active
                                                    </Badge>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="py-10 text-center">
                                    <Clock className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                                    <p className="text-sm text-slate-500 italic">
                                        No maintenance intervals yet. Upload manuals and run the AI copilot.
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-8">
                    <MaintenanceSetupCopilot machineId={machineId} />
                </div>
            </div>
        </div>
    );
}
