'use client';

import React, { useState } from 'react';
import { 
    Table, 
    TableBody, 
    TableCell, 
    TableHead, 
    TableHeader, 
    TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
    Truck, 
    MapPin, 
    Clock, 
    CheckCircle2, 
    AlertTriangle, 
    MoreHorizontal,
    Navigation,
    Calendar,
    Mic,
    FileText
} from 'lucide-react';
import { Transport, TransportStatus } from '@/types/schema';
import { format } from 'date-fns';
import { 
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const STATUS_CONFIG: Record<TransportStatus, { label: string, color: string, icon: any }> = {
    'PENDING': { label: 'En Attente', color: 'bg-slate-200 text-slate-700', icon: Clock },
    'IN_TRANSIT': { label: 'En Route', color: 'bg-blue-100 text-blue-700', icon: Truck },
    'DELAYED': { label: 'Retardé', color: 'bg-red-100 text-red-700', icon: AlertTriangle },
    'DELIVERED': { label: 'Livré', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
    'CANCELLED': { label: 'Annulé', color: 'bg-slate-100 text-slate-500', icon: AlertTriangle }
};

export function TransportManagementTable({ initialTransports }: { initialTransports: any[] }) {
    const [transports, setTransports] = useState(initialTransports);

    return (
        <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
                <Table className="min-w-[1200px]">
                    <TableHeader className="bg-slate-50/50">
                        <TableRow>
                            <TableHead className="font-black text-slate-500 uppercase text-[10px] w-[150px]">Référence / Transporteur</TableHead>
                            <TableHead className="font-black text-slate-500 uppercase text-[10px] w-[200px]">Machine / Pièce</TableHead>
                            <TableHead className="font-black text-slate-500 uppercase text-[10px] w-[150px]">Lieu (Origine/Dest)</TableHead>
                            <TableHead className="font-black text-slate-500 uppercase text-[10px] w-[120px]">Statut</TableHead>
                            <TableHead className="font-black text-slate-500 uppercase text-[10px] w-[180px]">Dates Logistique</TableHead>
                            <TableHead className="font-black text-slate-500 uppercase text-[10px] w-[150px]">Notes Driver (IA)</TableHead>
                            <TableHead className="w-[50px] sticky right-0 bg-white"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {transports.map((t) => {
                            const Config = STATUS_CONFIG[t.status as TransportStatus] || STATUS_CONFIG.PENDING;
                            return (
                                <TableRow key={t.id} className="hover:bg-slate-50/50 transition-colors">
                                    <TableCell>
                                        <div className="font-black text-slate-900">{t.carrier_reference || 'REF-TBD'}</div>
                                        <div className="text-[10px] text-slate-400 font-bold uppercase">{t.transporter_name}</div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <div className="p-1.5 bg-blue-50 rounded-lg">
                                                <Navigation className="w-3.5 h-3.5 text-blue-600" />
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-800 text-xs">
                                                    {t.machine?.make} {t.machine?.model}
                                                </div>
                                                <div className="text-[9px] font-black text-slate-400">SN: {t.machine?.serial_number}</div>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="text-[10px] space-y-0.5">
                                            <div className="flex items-center gap-1 text-slate-500">
                                                <MapPin className="w-2.5 h-2.5" /> {t.origin || '---'}
                                            </div>
                                            <div className="flex items-center gap-1 font-black text-slate-800">
                                                <Navigation className="w-2.5 h-2.5" /> {t.destination || '---'}
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge className={`rounded-xl border-none font-black text-[9px] gap-1.5 shadow-sm ${Config.color}`}>
                                            <Config.icon className="w-2.5 h-2.5" />
                                            {Config.label}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-[10px]">
                                        <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                                            <span className="text-slate-400">Départ:</span>
                                            <span className="font-bold">{t.pickup_date_est ? format(new Date(t.pickup_date_est), 'dd MMM') : '---'}</span>
                                            <span className="text-slate-400">Arrivée:</span>
                                            <span className="font-bold text-blue-600 italic">
                                                {t.delivery_date_est ? format(new Date(t.delivery_date_est), 'dd MMM') : 'TBD'}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {t.voice_note_id ? (
                                            <div className="flex items-center gap-1.5 p-1.5 bg-slate-50 rounded-xl border border-slate-100">
                                                <Mic className="w-3 h-3 text-red-500 animate-pulse" />
                                                <span className="text-[9px] font-bold text-slate-600 truncate max-w-[100px]">Rapport IA Dispo</span>
                                            </div>
                                        ) : (
                                            <span className="text-[9px] text-slate-300 italic">Aucune note</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="sticky right-0 bg-white/95 backdrop-blur-sm">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-slate-100 rounded-full">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="rounded-2xl border-slate-200 shadow-2xl w-56 p-1.5">
                                                <DropdownMenuLabel className="text-[10px] uppercase font-black text-slate-400 px-3 py-2">Logistique & Actions</DropdownMenuLabel>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem className="rounded-xl gap-3 text-xs font-bold py-2.5 cursor-pointer">
                                                    <Navigation className="w-4 h-4 text-blue-600" /> Suivre Colis
                                                </DropdownMenuItem>
                                                <DropdownMenuItem className="rounded-xl gap-3 text-xs font-bold py-2.5 cursor-pointer">
                                                    <FileText className="w-4 h-4 text-emerald-600" /> Voir Rapport IA
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem className="rounded-xl gap-3 text-xs font-bold py-2.5 text-red-600 cursor-pointer">
                                                    <AlertTriangle className="w-4 h-4" /> Signaler Retard
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
