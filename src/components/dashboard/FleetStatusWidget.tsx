import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Clock, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export async function FleetStatusWidget() {
    const supabase = createClient();

    // 1. Get all machines
    const { data: machines } = await supabase
        .from('machines')
        .select('id, model, serial_number, make, current_hours')
        .order('model');

    if (!machines) return null;

    // 2. Get TODAY's checklists for these machines
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayIso = today.toISOString();

    const { data: checklists } = await supabase
        .from('checklists')
        .select('machine_id, template_id, is_compliant, created_at, checklist_templates(name)')
        .gte('created_at', todayIso);

    // 3. Aggregate Status
    const fleetStatus = machines.map(machine => {
        const machineChecks = checklists?.filter(c => c.machine_id === machine.id) || [];

        // Naive logic: Look for "Matin" and "Soir" in template name or time of day
        // In real app, we'd have explicit types. Here using text match on simulation data.
        const morningCheck = machineChecks.find(c => {
            const tmpl = c.checklist_templates as any;
            return tmpl?.name?.toLowerCase().includes('matin') || new Date(c.created_at).getHours() < 12;
        });

        const eveningCheck = machineChecks.find(c => {
            const tmpl = c.checklist_templates as any;
            return tmpl?.name?.toLowerCase().includes('soir') || new Date(c.created_at).getHours() >= 12;
        });

        return {
            ...machine,
            morning: morningCheck,
            evening: eveningCheck,
            status: (morningCheck?.is_compliant === false || eveningCheck?.is_compliant === false) ? 'ISSUE' : 'OK'
        };
    });

    return (
        <Card className="col-span-full xl:col-span-4 border-slate-100 shadow-sm overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Clock className="w-5 h-5 text-brand-primary" />
                            Daily Fleet Pulse
                        </CardTitle>
                        <CardDescription>Real-time machine compliance status (Today)</CardDescription>
                    </div>
                    <div className="flex gap-2 text-xs">
                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-green-50 text-green-700 border border-green-200">
                            <CheckCircle2 className="w-3 h-3" /> Compliant
                        </div>
                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-red-50 text-red-700 border border-red-200">
                            <XCircle className="w-3 h-3" /> Issue
                        </div>
                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                            <span className="w-3 h-3 rounded-full border border-slate-300 block"></span> Pending
                        </div>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader className="bg-slate-50/50">
                            <TableRow>
                                <TableHead className="min-w-[150px]">Machine</TableHead>
                                <TableHead className="text-center min-w-[100px]">Morning Check</TableHead>
                                <TableHead className="text-center min-w-[100px]">Evening Check</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {fleetStatus.map((item) => (
                                <TableRow key={item.id} className="hover:bg-slate-50/50 transition-colors">
                                    <TableCell>
                                        <div className="font-medium text-slate-900">{item.make} {item.model}</div>
                                        <div className="text-xs text-slate-500 font-mono">S/N: {item.serial_number}</div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <StatusBadge check={item.morning} />
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <StatusBadge check={item.evening} />
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Link href={`/dashboard/machines/${item.id}`} className="text-xs font-medium text-brand-primary hover:underline">
                                            View Log
                                        </Link>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}

function StatusBadge({ check }: { check?: any }) {
    if (!check) {
        return (
            <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 border border-slate-200 mx-auto">
                <span className="sr-only">Pending</span>
            </div>
        );
    }
    if (check.is_compliant) {
        return (
            <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-green-100 text-green-600 border border-green-200 mx-auto animate-in zoom-in-50">
                <CheckCircle2 className="w-5 h-5" />
            </div>
        );
    }
    return (
        <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-red-100 text-red-600 border border-red-200 mx-auto animate-in zoom-in-50">
            <XCircle className="w-5 h-5" />
        </div>
    );
}
