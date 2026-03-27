'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Clock, User, CheckCircle2, ChevronRight, FileCheck, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { generateInterventionReport } from '@/domain/interventions/actions/reporting';
import { toast } from 'sonner';

interface WorkOrder {
    id: string;
    status: string;
    formatted_report: any;
    technician_name?: string;
    created_at: string;
}

export function WorkOrderHub({ workOrders, machineId }: { workOrders: any[], machineId: string }) {
    const [generating, setGenerating] = React.useState<string | null>(null);

    const handleGenerateReport = async (woId: string) => {
        setGenerating(woId);
        const res = await generateInterventionReport(woId, machineId);
        if (res.success) {
            toast.success("Scientific report generated successfully");
        } else {
            toast.error(res.error || "Generation failed");
        }
        setGenerating(null);
    };
    if (!workOrders || workOrders.length === 0) {
        return (
            <Card className="border-slate-200 shadow-sm opacity-60">
                <CardContent className="p-12 text-center space-y-4">
                    <FileText className="h-12 w-12 text-slate-300 mx-auto" />
                    <p className="text-slate-500 font-medium">Aucun bon de travail archivé pour cette machine.</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="shadow-sm border-slate-200">
            <CardHeader>
                <CardTitle className="text-lg font-black flex items-center gap-2">
                    <FileText className="h-5 w-5 text-blue-500" />
                    Archive des Bons de Travail (IA)
                </CardTitle>
                <CardDescription>Historique des interventions documentées par dictée IA.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
                <div className="divide-y divide-slate-100">
                    {workOrders.map((wo) => (
                        <div key={wo.id} className="p-6 hover:bg-slate-50 transition-colors flex items-center justify-between group cursor-pointer">
                            <div className="flex items-start gap-4">
                                <div className="bg-slate-100 p-3 rounded-2xl group-hover:bg-blue-100 transition-colors">
                                    <FileText className="h-6 w-6 text-slate-500 group-hover:text-blue-600" />
                                </div>
                                <div className="space-y-1">
                                    <h4 className="font-bold text-slate-900">
                                        {wo.formatted_report?.problem || 'Intervention Standard'}
                                    </h4>
                                    <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
                                        <span className="flex items-center gap-1"><User className="h-3 w-3" /> Tech: {wo.technician_name || 'System'}</span>
                                        <span>•</span>
                                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {new Date(wo.created_at).toLocaleDateString()}</span>
                                    </div>
                                    <div className="flex gap-1 mt-2">
                                        {wo.formatted_report?.actions?.slice(0, 2).map((a: string, i: number) => (
                                            <Badge key={i} variant="outline" className="text-[9px] bg-white border-slate-200 px-1.5 py-0">
                                                {a}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <Badge className={wo.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}>
                                    {wo.status}
                                </Badge>
                                {wo.status === 'COMPLETED' && !wo.pdf_url && (
                                    <Button 
                                        size="sm" 
                                        variant="outline" 
                                        className="h-8 text-[10px] font-black border-blue-200 text-blue-600 hover:bg-blue-50"
                                        onClick={() => handleGenerateReport(wo.id)}
                                        disabled={generating === wo.id}
                                    >
                                        {generating === wo.id ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : <FileCheck className="w-3 h-3 mr-2" />}
                                        CERTIFY V9
                                    </Button>
                                )}
                                {wo.pdf_url && (
                                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-none font-black text-[9px]">
                                        CERTIFIED ✅
                                    </Badge>
                                )}
                                <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-slate-900 transition-colors" />
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
