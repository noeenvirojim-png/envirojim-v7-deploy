import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Wrench, Package, Activity, CheckCircle2, Circle } from 'lucide-react';
import { getCurrentUserOrgId } from '@/lib/auth-bridge';

export async function ActivityTimeline() {
    const orgId = await getCurrentUserOrgId();
    if (!orgId) return null;

    const supabase = createClient();
    // Use activity_logs (real v9 table) instead of non-existent v_unified_activity view
    const { data: activity, error } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })
        .limit(15);

    if (error) {
        console.error('Error fetching activity timeline:', error);
        return null;
    }

    const typeConfig: Record<string, { icon: any, color: string, bg: string }> = {
        'MACHINE': { icon: Wrench, color: 'text-blue-600', bg: 'bg-blue-100' },
        'REQUEST': { icon: Package, color: 'text-purple-600', bg: 'bg-purple-100' },
        'INTERVENTION': { icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-100' },
        'DIAGNOSTIC': { icon: Activity, color: 'text-amber-600', bg: 'bg-amber-100' }
    };

    return (
        <Card className="border-slate-100 shadow-sm h-full overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                    <ClockIcon className="w-5 h-5 text-slate-400" />
                    Recent Activity
                </CardTitle>
                <CardDescription>Unified timeline of fleet operations.</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
                <div className="relative space-y-8 before:absolute before:inset-0 before:ml-4 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
                    {activity?.map((item: any) => {
                        const config = typeConfig[item.entity_type] || { icon: Circle, color: 'text-slate-400', bg: 'bg-slate-100' };
                        return (
                            <div key={item.id} className="relative flex items-center justify-between gap-6 group">
                                <div className="flex items-center gap-4">
                                    <div className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full ${config.bg} ${config.color} ring-4 ring-white`}>
                                        <config.icon className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-slate-900 leading-none mb-1">{item.action}</p>
                                        <p className="text-xs text-slate-500 line-clamp-1">{item.entity_type} {item.entity_id ? `(${String(item.entity_id).slice(0, 8)})` : ''}</p>
                                    </div>
                                </div>
                                <time className="text-[10px] font-medium text-slate-400 whitespace-nowrap">
                                    {new Date(item.created_at).toLocaleString()}
                                </time>
                            </div>
                        );
                    })}

                    {(!activity || activity.length === 0) && (
                        <div className="text-center py-8">
                            <p className="text-sm text-slate-400">No recent activity detected.</p>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

function ClockIcon(props: any) {
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
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
        </svg>
    )
}
