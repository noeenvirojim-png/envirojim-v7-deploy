import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export async function TicketsTab({ machineId }: { machineId: string }) {
    const supabase = createClient();
    // Current schema uses work_orders as the primary ticket/task entity for machines
    const { data: workOrders } = await supabase
        .from('work_orders')
        .select('*')
        .eq('machine_id', machineId)
        .order('created_at', { ascending: false })
        .limit(20);

    // Also fetch internal diagnostic tickets
    const { data: internalTickets } = await supabase
        .from('internal_tickets')
        .select('*')
        .eq('machine_id', machineId)
        .order('created_at', { ascending: false })
        .limit(20);

    const allTickets = [
        ...(workOrders || []).map(wo => ({ ...wo, type: 'work_order' })),
        ...(internalTickets || []).map(it => ({ ...it, type: 'internal' }))
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return (
        <Card className="animate-fade-in">
            <CardHeader>
                <CardTitle>Support Tickets & Work Orders</CardTitle>
                <CardDescription>Intervention requests, reported issues, active work orders, and diagnostic sessions for this machine.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {allTickets.length > 0 ? (
                        allTickets.map((ticket: any) => (
                            <div key={ticket.id} className="flex items-center justify-between p-4 border rounded-xl bg-slate-50">
                                <div className="flex items-center gap-3">
                                    <FileText className="h-6 w-6 text-slate-400" />
                                    <div className="flex-1">
                                        <h4 className="font-bold text-slate-800">{ticket.title}</h4>
                                        <p className="text-xs text-slate-500">
                                            {ticket.type === 'internal' && '🔍 Diagnostic - '}
                                            Opened {new Date(ticket.created_at).toLocaleDateString()}
                                            {ticket.priority && <span className="ml-2 font-bold uppercase">| {ticket.priority}</span>}
                                        </p>
                                        {/* Enriched diagnostic fields */}
                                        {ticket.type === 'internal' && (ticket.severity || ticket.confidence !== undefined) && (
                                            <div className="mt-2 flex gap-2 flex-wrap text-[10px]">
                                                {ticket.severity && (
                                                    <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                                                        Severity: {ticket.severity}
                                                    </Badge>
                                                )}
                                                {ticket.confidence !== undefined && (
                                                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                                        {ticket.confidence}% Confidence
                                                    </Badge>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    <Badge variant="outline" className={
                                        ticket.status === 'open' || ticket.status === 'OPEN' || ticket.status === 'pending' ? 'text-amber-600 bg-amber-50' :
                                        ticket.status === 'completed' || ticket.status === 'closed' ? 'text-green-600 bg-green-50' :
                                        'text-slate-600'
                                    }>
                                        {ticket.status}
                                    </Badge>
                                    {/* Work order enriched source indicator */}
                                    {ticket.type === 'work_order' && ticket.source === 'maintenance_enriched' && (
                                        <Badge variant="secondary" className="text-[10px]">
                                            ⚙️ Enriched Maintenance
                                        </Badge>
                                    )}
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="text-slate-500 italic text-center py-6">No tickets or work orders for this machine.</p>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
