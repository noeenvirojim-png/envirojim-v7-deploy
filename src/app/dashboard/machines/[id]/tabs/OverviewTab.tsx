import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Activity,
    Settings2,
    Calendar,
    Package,
    Truck,
    FileSignature,
    Cpu,
    Boxes,
    MessageSquareText,
    Brain,
    FileText,
    Wrench,
    BookOpen,
    AlertTriangle
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Machine, UserRole } from '@/types/schema';
import { MachineActionCenter } from '../components/MachineActionCenter.client';

type KbSummary = {
    kbStatus?: string;
    totalEntities?: number;
    partsCount?: number;
    proceduresCount?: number;
    faultsCount?: number;
    documentsTotal?: number;
    documentsProcessed?: number;
    canonicalClusters?: number;
} | null;

export async function OverviewTab({ machine, userRole, kbSummary }: { machine: Machine, userRole?: UserRole, kbSummary?: KbSummary }) {
    const isAdmin = userRole && ['SUPER_ADMIN', 'ENVIROJIM_ADMIN', 'DEALER_ADMIN'].includes(userRole);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <MachineActionCenter machineId={machine.id} kbData={kbSummary} />
            {/* Top Row: Engine & Performance */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card className="border-slate-200 shadow-sm">
                    <CardHeader className="pb-2 border-b bg-slate-50/50">
                        <CardTitle className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                            <Cpu className="w-4 h-4" />
                            Engine Specifications
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4">
                        <div className="space-y-3">
                            <div>
                                <p className="text-[10px] text-slate-400 font-bold uppercase">Make / Model</p>
                                <p className="text-sm font-bold text-slate-900">{machine.engine_make || 'N/A'} - {machine.engine_model || 'Standard'}</p>
                            </div>
                            <div className="flex justify-between border-t border-slate-50 pt-2">
                                <div>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase">Serial Number</p>
                                    <p className="text-xs font-mono font-semibold">{machine.engine_serial || 'SN N/A'}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] text-slate-400 font-bold uppercase">Registered</p>
                                    <p className="text-xs font-semibold">{machine.engine_registration_date || '-- / -- / --'}</p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-slate-200 shadow-sm">
                    <CardHeader className="pb-2 border-b bg-slate-50/50">
                        <CardTitle className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                            <Boxes className="w-4 h-4" />
                            Shafts & Drive
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-emerald-50 rounded-xl">
                                <Settings2 className="w-6 h-6 text-emerald-600" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-slate-900">{machine.shafts_config || 'Standard Configuration'}</p>
                                <p className="text-xs text-slate-500 italic">Optimized for high-torque output</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-slate-200 shadow-sm">
                    <CardHeader className="pb-2 border-b bg-slate-50/50">
                        <CardTitle className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                            <Activity className="w-4 h-4" />
                            Usage Metrics
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4">
                        <div className="flex items-end gap-2">
                            <span className="text-3xl font-black text-slate-900">{machine.current_hours}</span>
                            <span className="text-sm font-bold text-slate-400 mb-1">HOURS</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 mt-3 overflow-hidden">
                            <div className="bg-brand-primary h-full rounded-full" style={{ width: '65%' }}></div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Middle Row: Procurement & Sales (Admin Only) */}
            {isAdmin && (
                <div className="grid md:grid-cols-2 lg:grid-cols-2 gap-6">
                    <Card className="border-slate-200 shadow-sm">
                        <CardHeader className="pb-2 border-b bg-slate-50/50">
                            <CardTitle className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                                <Calendar className="w-4 h-4" />
                                Sales & Lifecycle
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                                    <p className="text-[10px] text-slate-400 font-extrabold uppercase mb-1">Sale Date</p>
                                    <p className="text-sm font-bold text-slate-700">{machine.sale_date || 'N/A'}</p>
                                </div>
                                <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                                    <p className="text-[10px] text-slate-400 font-extrabold uppercase mb-1">Purchase Order</p>
                                    <p className="text-sm font-bold text-slate-700">{machine.po_number || 'INTERNAL'}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-slate-200 shadow-sm">
                        <CardHeader className="pb-2 border-b bg-slate-50/50">
                            <CardTitle className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                                <Package className="w-4 h-4" />
                                Procurement Flow
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-sm font-bold text-slate-900">{machine.supplier || 'N/A'}</p>
                                    <p className="text-xs text-slate-500">Quotation: {machine.quotation_number || '--'}</p>
                                </div>
                                <div className="text-right">
                                    <Badge variant="outline" className="text-[10px] h-5 bg-blue-50 text-blue-700 border-blue-200">
                                        INV: {machine.invoice_number || 'PENDING'}
                                    </Badge>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Intelligence Summary */}
            {kbSummary && kbSummary.totalEntities != null && kbSummary.totalEntities > 0 && (
                <Card className="border-blue-100 shadow-sm bg-gradient-to-r from-blue-50/30 to-white">
                    <CardHeader className="pb-2 border-b bg-blue-50/30">
                        <CardTitle className="text-xs font-bold text-blue-600 uppercase flex items-center gap-2">
                            <Brain className="w-4 h-4" />
                            Machine Intelligence
                            <Badge variant="outline" className="ml-2 text-[9px] h-4 border-blue-200 text-blue-600">
                                {kbSummary.kbStatus ?? 'active'}
                            </Badge>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div className="flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-100">
                                <FileText className="w-4 h-4 text-slate-400" />
                                <div>
                                    <p className="text-lg font-black text-slate-900">{kbSummary.documentsProcessed ?? 0}</p>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase">Docs Processed</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 p-2 bg-white rounded-lg border border-blue-100">
                                <Wrench className="w-4 h-4 text-blue-500" />
                                <div>
                                    <p className="text-lg font-black text-blue-700">{kbSummary.partsCount ?? 0}</p>
                                    <p className="text-[9px] font-bold text-blue-400 uppercase">Parts Found</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 p-2 bg-white rounded-lg border border-emerald-100">
                                <BookOpen className="w-4 h-4 text-emerald-500" />
                                <div>
                                    <p className="text-lg font-black text-emerald-700">{kbSummary.proceduresCount ?? 0}</p>
                                    <p className="text-[9px] font-bold text-emerald-400 uppercase">Procedures</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 p-2 bg-white rounded-lg border border-amber-100">
                                <AlertTriangle className="w-4 h-4 text-amber-500" />
                                <div>
                                    <p className="text-lg font-black text-amber-700">{kbSummary.faultsCount ?? 0}</p>
                                    <p className="text-[9px] font-bold text-amber-400 uppercase">Fault Cases</p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Bottom Section: Delivery & Notes */}
            <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-2 border-b bg-slate-50/50">
                    <CardTitle className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                        <Truck className="w-4 h-4" />
                        Logistics & Infrastructure
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                    <div className="grid lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 space-y-4">
                            <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100 italic text-slate-600 text-sm">
                                <MessageSquareText className="w-5 h-5 text-slate-400 shrink-0" />
                                "{machine.notes || 'No technical notes recorded for this asset yet.'}"
                            </div>
                            {isAdmin && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase">Transport Type</p>
                                        <p className="text-xs font-bold">{machine.transport_type || 'STANDARD'}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase">Tracking No.</p>
                                        <p className="text-xs font-mono font-bold text-blue-600">{machine.tracking_number || '--'}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                        {isAdmin && (
                            <div className="border-l pl-6 space-y-3">
                                <div className="p-3 bg-blue-600 rounded-xl text-white text-center">
                                    <FileSignature className="w-6 h-6 mx-auto mb-2 opacity-80" />
                                    <p className="text-[10px] font-bold uppercase tracking-wider">Client Invoice</p>
                                    <p className="text-xs font-medium">Download Vault</p>
                                </div>
                                <p className="text-[10px] text-slate-400 text-center italic">Secure encrypted PDF</p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
