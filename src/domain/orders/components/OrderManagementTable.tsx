'use client';

import React, { useState, useMemo } from 'react';
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
import { Input } from '@/components/ui/input';
import { 
    Search, 
    Filter, 
    Download, 
    Mail, 
    ExternalLink, 
    Clock, 
    Truck, 
    CheckCircle2, 
    AlertCircle,
    MoreHorizontal,
    FileText,
    TrendingUp
} from 'lucide-react';
import { PartOrder, InternalOrderStatus, ClientOrderStatus } from '@/types/schema';
import { format } from 'date-fns';
import { 
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { generateOrderEmail } from '../actions/order-management';

const INTERNAL_STATUS_CONFIG: Record<InternalOrderStatus, { label: string, color: string }> = {
    'REQUEST_ENTRY': { label: 'Entrée Demande', color: 'bg-red-500' },
    'QUOTE_CREATED': { label: 'Devis Créé', color: 'bg-orange-500' },
    'ORDER_TRANSMITTED': { label: 'Commande Envoyée', color: 'bg-blue-500' },
    'IN_TRANSIT': { label: 'En Transit', color: 'bg-purple-500' },
    'RECEIVED_INTERNAL': { label: 'Reçu Interne', color: 'bg-emerald-500' },
    'DELIVERED_FINAL': { label: 'Livraison Finale', color: 'bg-green-600' }
};

const CLIENT_STATUS_CONFIG: Record<ClientOrderStatus, { label: string, color: string }> = {
    'REQUEST_INITIAL': { label: 'Demande Envoyée', color: 'bg-red-500' },
    'QUOTATION_SENT': { label: 'Approbation', color: 'bg-orange-500' },
    'PO_CONFIRMED': { label: 'Confirmé', color: 'bg-green-500' },
    'DELIVERY_PENDING': { label: 'En Livraison', color: 'bg-blue-500' },
    'RECEIVED_CLIENT': { label: 'Reçu par Client', color: 'bg-emerald-500' }
};

export function OrderManagementTable({ initialOrders }: { initialOrders: any[] }) {
    const [orders, setOrders] = useState(initialOrders);
    const [search, setSearch] = useState('');

    const filteredOrders = useMemo(() => {
        return orders.filter(o => 
            o.description_fuzzy?.toLowerCase().includes(search.toLowerCase()) ||
            o.machine?.serial_number?.toLowerCase().includes(search.toLowerCase()) ||
            o.qb_quote_number?.toLowerCase().includes(search.toLowerCase())
        );
    }, [orders, search]);

    const handleEmail = async (id: string, type: 'SUPPLIER' | 'CLIENT' | 'BILLING') => {
        const { mailto } = await generateOrderEmail(id, type);
        window.location.href = mailto;
    };

    return (
        <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-4 p-2 bg-white rounded-2xl shadow-sm border border-slate-100">
                <div className="flex items-center gap-2 flex-1 min-w-[300px]">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input 
                            placeholder="Rechercher par SN, QB#, ou Pièce..." 
                            className="pl-10 h-10 rounded-xl border-slate-200"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" className="h-10 rounded-xl gap-2 font-bold text-slate-600 shadow-sm">
                        <Filter className="h-4 w-4" /> Filtres
                    </Button>
                    <Button variant="outline" className="h-10 rounded-xl gap-2 font-bold text-slate-600 shadow-sm text-xs">
                        <TrendingUp className="h-4 w-4" /> Statut Rapide
                    </Button>
                    <Button variant="outline" className="h-10 rounded-xl text-slate-600 shadow-sm border-emerald-200 text-emerald-600 font-black">
                        <Download className="h-4 w-4 mr-2" /> EXPORT CSV
                    </Button>
                </div>
            </div>

            {/* Table Container */}
            <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <Table className="min-w-[1500px]">
                        <TableHeader className="bg-slate-50/50">
                            <TableRow>
                                <TableHead className="font-black text-slate-500 uppercase text-[10px] w-[100px]">QB Devis #</TableHead>
                                <TableHead className="font-black text-slate-500 uppercase text-[10px] w-[150px]">Machine / SN</TableHead>
                                <TableHead className="font-black text-slate-500 uppercase text-[10px] w-[200px]">Pièce Demandée</TableHead>
                                <TableHead className="font-black text-slate-500 uppercase text-[10px] w-[100px]">Destination</TableHead>
                                <TableHead className="font-black text-slate-500 uppercase text-[10px] w-[120px]">Statut Interne</TableHead>
                                <TableHead className="font-black text-slate-500 uppercase text-[10px] w-[120px]">Statut Client</TableHead>
                                <TableHead className="font-black text-slate-500 uppercase text-[10px] w-[100px]">Transport</TableHead>
                                <TableHead className="font-black text-slate-500 uppercase text-[10px] w-[120px]">Tracking #</TableHead>
                                <TableHead className="font-black text-slate-500 uppercase text-[10px] w-[150px]">Poids / Dims</TableHead>
                                <TableHead className="font-black text-slate-500 uppercase text-[10px] w-[200px]">Dates Logistique</TableHead>
                                <TableHead className="font-black text-slate-500 uppercase text-[10px] w-[100px]">Costs</TableHead>
                                <TableHead className="w-[50px] sticky right-0 bg-white shadow-[-10px_0_10px_-10px_rgba(0,0,0,0.1)]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredOrders.map((o) => (
                                <TableRow key={o.id} className="hover:bg-slate-50/80 transition-colors">
                                    <TableCell>
                                        <div className="font-black text-slate-900">{o.qb_quote_number || '---'}</div>
                                        <div className="text-[9px] text-slate-400">Facture: {o.invoice_number || 'Waiting'}</div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="font-bold text-slate-800 leading-tight">
                                            {o.machine?.make} {o.machine?.model}
                                        </div>
                                        <div className="text-[10px] font-black text-blue-600 mt-0.5">SN: {o.machine?.serial_number}</div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="text-xs font-medium text-slate-700">{o.description_fuzzy}</div>
                                        <div className="text-[10px] text-slate-400 mt-1">Quantité: {o.quantity}</div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className={`text-[10px] font-bold ${o.destination_type === 'CLIENT' ? 'border-amber-200 text-amber-700 bg-amber-50' : 'border-blue-200 text-blue-700 bg-blue-50'}`}>
                                            {o.destination_type}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full ${INTERNAL_STATUS_CONFIG[o.internal_status as InternalOrderStatus]?.color}`} />
                                            <span className="text-[11px] font-bold text-slate-700">{INTERNAL_STATUS_CONFIG[o.internal_status as InternalOrderStatus]?.label}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full ${CLIENT_STATUS_CONFIG[o.client_status as ClientOrderStatus]?.color}`} />
                                            <span className="text-[11px] font-bold text-slate-700">{CLIENT_STATUS_CONFIG[o.client_status as ClientOrderStatus]?.label}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="secondary" className="text-[9px] font-black bg-slate-100 text-slate-600 uppercase tracking-tighter">
                                            {o.transport_type}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        {o.tracking_number ? (
                                            <a href={`#`} className="text-[10px] font-bold text-blue-600 flex items-center hover:underline cursor-pointer">
                                                {o.tracking_number} <ExternalLink className="w-2.5 h-2.5 ml-1" />
                                            </a>
                                        ) : (
                                            <span className="text-[10px] text-slate-300 italic">No Tracking</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-[10px]">
                                        <div className="font-bold text-slate-600">{o.weight || '---'} kg</div>
                                        <div className="text-slate-400">{o.dimensions || '---'} cm</div>
                                    </TableCell>
                                    <TableCell className="text-[10px]">
                                        <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                                            <span className="text-slate-400">Arrivée Int:</span>
                                            <span className="font-bold text-slate-700">{o.intl_arrival_date ? format(new Date(o.intl_arrival_date), 'dd/MM') : '---'}</span>
                                            <span className="text-slate-400">Final Del.:</span>
                                            <span className="font-bold text-emerald-700">{o.final_delivery_date ? format(new Date(o.final_delivery_date), 'dd/MM') : '---'}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="text-[10px] font-black text-slate-800">${o.transport_cost || '0'}</div>
                                        <div className="text-[9px] text-slate-400">Quote: ${o.transport_price_quote || '0'}</div>
                                    </TableCell>
                                    <TableCell className="sticky right-0 bg-white/95 backdrop-blur-sm shadow-[-10px_0_10px_-10px_rgba(0,0,0,0.1)]">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-slate-100 rounded-full">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="rounded-xl border-slate-200 w-48 shadow-2xl">
                                                <DropdownMenuLabel className="text-[10px] uppercase font-black text-slate-400">Actions Workflow</DropdownMenuLabel>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem onClick={() => handleEmail(o.id, 'CLIENT')} className="gap-2 text-xs font-bold cursor-pointer">
                                                    <Mail className="w-3.5 h-3.5" /> Envoi Devis Client
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleEmail(o.id, 'SUPPLIER')} className="gap-2 text-xs font-bold cursor-pointer">
                                                    <Truck className="w-3.5 h-3.5" /> Commande Fournisseur
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleEmail(o.id, 'BILLING')} className="gap-2 text-xs font-bold cursor-pointer text-emerald-600">
                                                    <CheckCircle2 className="w-3.5 h-3.5" /> Facturation (Fin)
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem className="gap-2 text-xs font-bold cursor-pointer">
                                                    <FileText className="w-3.5 h-3.5" /> Voir PDF Devis
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </div>

            {/* Pagination Placeholder */}
            <div className="flex items-center justify-between text-[11px] text-slate-400 px-4">
                <p>Affichage de {filteredOrders.length} commandes</p>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="h-8 text-[10px] font-bold rounded-lg" disabled>Précédent</Button>
                    <Button variant="outline" size="sm" className="h-8 text-[10px] font-bold rounded-lg" disabled>Suivant</Button>
                </div>
            </div>
        </div>
    );
}
