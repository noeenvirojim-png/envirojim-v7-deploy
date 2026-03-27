import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, User as UserIcon, Activity, Settings, FileText, AlertCircle } from 'lucide-react';

export async function HistoryTab({ machineId }: { machineId: string }) {
    const supabase = createClient();

    // Use activity_logs (v9 schema) which tracks per-machine activity
    const { data: logs } = await supabase.from('activity_logs')
        .select('*')
        .eq('machine_id', machineId)
        .order('created_at', { ascending: false })
        .limit(50);

    const getIcon = (action: string) => {
        if (action.includes('create') || action.includes('CREATE')) return <Activity size={16} className="text-blue-500" />;
        if (action.includes('update') || action.includes('UPDATE')) return <Settings size={16} className="text-amber-500" />;
        if (action.includes('ingestion') || action.includes('AI')) return <AlertCircle size={16} className="text-green-500" />;
        if (action.includes('upload') || action.includes('UPLOAD') || action.includes('document')) return <FileText size={16} className="text-slate-500" />;
        return <Clock size={16} className="text-slate-400" />;
    };

    return (
        <div className="space-y-6">
            <Card className="border-slate-200">
                <CardHeader className="bg-slate-50/50 border-b">
                    <div>
                        <CardTitle className="text-lg">Machine Activity Trail</CardTitle>
                        <CardDescription>History of modifications, AI analysis, and technical updates.</CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="relative">
                        {/* Timeline Line */}
                        <div className="absolute left-8 top-0 bottom-0 w-px bg-slate-200 z-0" />

                        <div className="divide-y divide-slate-100">
                            {logs && logs.length > 0 ? logs.map((log: any) => (
                                <div key={log.id} className="relative z-10 flex items-start gap-6 p-6 hover:bg-slate-50/30 transition-colors">
                                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white border-2 border-slate-100 shadow-sm">
                                        {getIcon(log.action)}
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <div className="flex items-center justify-between">
                                            <h4 className="font-bold text-slate-900 uppercase text-xs tracking-wider">
                                                {(log.action || '').replace(/_/g, ' ')}
                                            </h4>
                                            <time className="text-[10px] font-mono text-slate-400">
                                                {new Date(log.created_at).toLocaleString()}
                                            </time>
                                        </div>
                                        <p className="text-sm text-slate-600">
                                            {log.entity_type}: {log.action} on {log.entity_id ? `record ${String(log.entity_id).slice(0, 8)}...` : 'machine'}
                                        </p>
                                        {log.payload && Object.keys(log.payload).length > 0 && (
                                            <div className="mt-3 p-3 rounded-lg bg-slate-100/50 border border-slate-200/50 text-xs font-mono text-slate-500">
                                                <pre className="whitespace-pre-wrap">
                                                    {JSON.stringify(log.payload, null, 2)}
                                                </pre>
                                            </div>
                                        )}
                                        <div className="flex items-center gap-2 mt-2">
                                            <UserIcon size={12} className="text-slate-400" />
                                            <span className="text-[10px] font-semibold text-slate-500 uppercase">
                                                {log.actor_user_id ? `ID: ${String(log.actor_user_id).slice(0, 8)}` : 'System'}
                                            </span>
                                            <Badge variant="outline" className="text-[9px] h-4 border-slate-200">
                                                Verified
                                            </Badge>
                                        </div>
                                    </div>
                                </div>
                            )) : (
                                <div className="p-12 text-center">
                                    <Activity size={48} className="mx-auto text-slate-200 mb-4" />
                                    <p className="text-slate-500">No activity events recorded for this machine yet.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
