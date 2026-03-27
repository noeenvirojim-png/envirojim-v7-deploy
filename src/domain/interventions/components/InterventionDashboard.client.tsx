'use client';

import React, { useEffect, useState } from "react";
import { getInterventions, triggerInterventionWorkflow } from "../actions/InterventionWorkflow";
import { 
    Table, 
    TableBody, 
    TableCell, 
    TableHead, 
    TableHeader, 
    TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { 
    Wrench, 
    User, 
    Calendar, 
    CheckCircle2, 
    Clock, 
    FileText, 
    Mic, 
    Package,
    Navigation,
    MoreHorizontal
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export const InterventionDashboard = () => {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getInterventions().then((res) => {
            setData(res);
            setLoading(false);
        });
    }, []);

    if (loading) return (
        <div className="flex h-64 items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-slate-900 rounded-2xl shadow-xl shadow-slate-200">
                        <Wrench className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Suivi Interventions</h1>
                        <p className="text-slate-400 text-sm font-bold uppercase tracking-widest">Service & Technical Operations Hub</p>
                    </div>
                </div>
                <Button className="h-12 px-8 rounded-2xl font-black bg-blue-600 hover:bg-blue-700 text-white shadow-xl shadow-blue-200 gap-2">
                    PROGRAMMER INTERVENTION
                </Button>
            </div>

            <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <Table className="min-w-[1200px]">
                        <TableHeader className="bg-slate-50/50">
                            <TableRow>
                                <TableHead className="font-black text-slate-500 uppercase text-[10px] w-[150px]">Machine (SN)</TableHead>
                                <TableHead className="font-black text-slate-500 uppercase text-[10px] w-[180px]">Technicien</TableHead>
                                <TableHead className="font-black text-slate-500 uppercase text-[10px] w-[200px]">Type Intervention</TableHead>
                                <TableHead className="font-black text-slate-500 uppercase text-[10px] w-[150px]">Dates (Plan/Réal)</TableHead>
                                <TableHead className="font-black text-slate-500 uppercase text-[10px] w-[120px]">Statut</TableHead>
                                <TableHead className="font-black text-slate-500 uppercase text-[10px] w-[150px]">Notes (IA)</TableHead>
                                <TableHead className="font-black text-slate-500 uppercase text-[10px] w-[120px]">Pièces</TableHead>
                                <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.map((row) => (
                                <TableRow key={row.id} className="hover:bg-slate-50/50 transition-colors">
                                    <TableCell>
                                        <div className="font-black text-slate-900">{row.SN}</div>
                                        <div className="text-[10px] text-slate-400 font-bold uppercase">{row.machine}</div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <div className="p-1.5 bg-slate-100 rounded-lg">
                                                <User className="w-3.5 h-3.5 text-slate-600" />
                                            </div>
                                            <span className="font-bold text-slate-800 text-xs">{row.technicien}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <span className="text-xs font-black text-slate-600 uppercase tracking-tight">{row.type}</span>
                                    </TableCell>
                                    <TableCell className="text-[10px]">
                                        <div className="flex flex-col gap-1">
                                            <span className="flex items-center gap-1.5 text-blue-600 font-bold italic">
                                                <Calendar className="w-2.5 h-2.5" /> {new Date(row.datePlanifiee).toLocaleDateString()}
                                            </span>
                                            {row.dateRealisation && (
                                                <span className="flex items-center gap-1.5 text-emerald-600 font-black">
                                                    <CheckCircle2 className="w-2.5 h-2.5" /> {new Date(row.dateRealisation).toLocaleDateString()}
                                                </span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge className={`rounded-xl border-none font-black text-[9px] gap-1.5 shadow-sm ${
                                            row.statut === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' : 
                                            row.statut === 'OPEN' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'
                                        }`}>
                                            {row.statut === 'COMPLETED' ? <CheckCircle2 className="w-2.5 h-2.5" /> : <Clock className="w-2.5 h-2.5" />}
                                            {row.statut}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1.5 p-1.5 bg-slate-50 rounded-xl border border-slate-100 group cursor-pointer hover:border-blue-200 transition-all">
                                            <Mic className="w-3 h-3 text-red-500 animate-pulse" />
                                            <span className="text-[9px] font-bold text-slate-600 truncate max-w-[100px]">{row.notes || 'En attente...'}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-500">
                                            <Package className="w-3 h-3" /> {row.piecesUtilisees || '---'}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="rounded-full hover:bg-slate-100"
                                            onClick={() => triggerInterventionWorkflow(row, "#")}
                                        >
                                            <Navigation className="h-4 w-4 text-blue-600" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    );
};
