'use client';

import React, { useEffect, useState } from "react";
import { getClientPortalData, triggerClientWorkflow } from "../actions/ClientPortalWorkflow";
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
    FileText, 
    CreditCard, 
    Truck, 
    ExternalLink, 
    Mail, 
    User,
    Package,
    ArrowRightCircle,
    BadgeCheck,
    Clock
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export const ClientPortalDashboard = () => {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getClientPortalData().then((res) => {
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
                    <div className="p-3 bg-blue-600 rounded-2xl shadow-lg">
                        <User className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Espace Client</h1>
                        <p className="text-slate-400 text-sm font-bold uppercase tracking-widest">Suivi de vos Devis & Commandes</p>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader className="bg-slate-50/50">
                            <TableRow>
                                <TableHead className="font-black text-slate-500 uppercase text-[10px]">Client / Machine</TableHead>
                                <TableHead className="font-black text-slate-500 uppercase text-[10px]">Commande</TableHead>
                                <TableHead className="font-black text-slate-500 uppercase text-[10px]">Devis</TableHead>
                                <TableHead className="font-black text-slate-500 uppercase text-[10px]">Facture</TableHead>
                                <TableHead className="font-black text-slate-500 uppercase text-[10px]">Paiement</TableHead>
                                <TableHead className="font-black text-slate-500 uppercase text-[10px]">Livraison</TableHead>
                                <TableHead className="w-[80px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.map((row) => (
                                <TableRow key={row.id} className="hover:bg-slate-50 transition-colors">
                                    <TableCell>
                                        <div className="font-black text-slate-900">{row.client}</div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Package className="h-3.5 w-3.5 text-blue-600" />
                                            <span className="text-xs font-bold text-slate-600 truncate max-w-[150px]">{row.commande}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="gap-1.5 border-slate-200 text-slate-600 rounded-xl px-2 py-0.5 font-bold">
                                            <FileText className="h-2.5 w-2.5" /> {row.devis}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="gap-1.5 border-slate-200 text-slate-600 rounded-xl px-2 py-0.5 font-bold">
                                            <CreditCard className="h-2.5 w-2.5" /> {row.facture}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        {row.paiement === 'Payé' ? (
                                            <Badge className="bg-emerald-100 text-emerald-700 rounded-xl gap-1.5 border-none font-black px-3 py-1 text-[10px]">
                                                <BadgeCheck className="h-3 w-3" /> PAYÉ
                                            </Badge>
                                        ) : (
                                            <Badge className="bg-orange-100 text-orange-700 rounded-xl gap-1.5 border-none font-black px-3 py-1 text-[10px]">
                                                <Clock className="h-3 w-3" /> EN ATTENTE
                                            </Badge>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500">
                                            <Truck className="h-3.5 w-3.5" /> {row.livraison}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-9 w-9 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-full"
                                            onClick={() => triggerClientWorkflow(row)}
                                        >
                                            <Mail className="h-4.5 w-4.5" />
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
