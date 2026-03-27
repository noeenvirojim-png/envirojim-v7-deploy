import { createClient } from '@/lib/supabase/server';
import { Card, CardContent } from '@/components/ui/card';
import { Activity, AlertCircle, CheckCircle2, Package, Wrench, Siren } from 'lucide-react';
import { getCurrentUserOrgId } from '@/lib/auth-bridge';

export async function KPIStrip() {
    const orgId = await getCurrentUserOrgId();
    if (!orgId) return null;

    const supabase = createClient();

    // Direct count queries against real tables instead of RPC
    // work_orders and part_orders are protected by native RLS using machine_id -> machines.owner_org_id
    // machines is explicitly filtered by organization_id
    const [machinesRes, workOrdersRes, partOrdersRes] = await Promise.all([
        supabase.from('machines').select('*', { count: 'exact', head: true }).eq('organization_id', orgId),
        supabase.from('work_orders').select('*', { count: 'exact', head: true }),
        supabase.from('part_orders').select('*', { count: 'exact', head: true }),
    ]);

    const kpis = [
        {
            title: 'Fleet Size',
            value: machinesRes.count ?? 0,
            label: 'Total machines',
            icon: Wrench,
            color: 'text-blue-600',
            bg: 'bg-blue-50',
            border: 'border-blue-100'
        },
        {
            title: 'Work Orders',
            value: workOrdersRes.count ?? 0,
            label: 'All statuses',
            icon: Activity,
            color: 'text-amber-600',
            bg: 'bg-amber-50',
            border: 'border-amber-100'
        },
        {
            title: 'Part Orders',
            value: partOrdersRes.count ?? 0,
            label: 'All statuses',
            icon: Package,
            color: 'text-purple-600',
            bg: 'bg-purple-50',
            border: 'border-purple-100'
        },
    ];

    return (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {kpis.map((kpi, i) => (
                <Card key={i} className={`overflow-hidden border shadow-sm hover:shadow-md transition-shadow ${kpi.border}`}>
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between">
                            <div className={`p-2 rounded-lg ${kpi.bg} ${kpi.color}`}>
                                <kpi.icon className="w-5 h-5" />
                            </div>
                            <div className="text-right">
                                <p className="text-sm font-medium text-slate-500">{kpi.title}</p>
                                <h3 className="text-2xl font-bold tracking-tight text-slate-900">{kpi.value}</h3>
                            </div>
                        </div>
                        <div className="mt-4 flex items-center text-xs">
                            <span className={`font-medium ${kpi.color}`}>{kpi.label}</span>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
