'use client'

import { Badge } from '@/components/ui/badge';
import { Calendar, User, Clock, MapPin, ChevronRight, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TechAgendaSidebarProps {
    technicians: any[];
    interventions: any[];
}

export default function TechAgendaSidebar({ technicians, interventions }: TechAgendaSidebarProps) {
    // Helper to find current intervention for a tech
    const getActiveIntervention = (techId: string) => {
        return interventions.find(i => i.technicianId === techId && !i.isCompleted);
    };

    return (
        <div className="w-80 border-l border-slate-200 bg-slate-50/50 flex flex-col h-full overflow-hidden shadow-inner">
            <div className="p-6 border-b border-slate-200 bg-white">
                <div className="flex items-center gap-2 mb-1">
                    <Calendar className="h-4 w-4 text-primary" />
                    <h2 className="font-bold text-slate-800">Agenda Techniciens</h2>
                </div>
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Temps Réel - {new Date().toLocaleDateString()}</p>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {technicians.map(tech => {
                    const activeJob = getActiveIntervention(tech.id);
                    const isBusy = !!activeJob;

                    return (
                        <div key={tech.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all group cursor-pointer">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 font-bold border-2 border-white shadow-sm">
                                        {tech.fullName?.charAt(0) || <User className="h-5 w-5" />}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-900 line-clamp-1">{tech.fullName}</p>
                                        <div className="flex items-center gap-1">
                                            <span className={cn(
                                                "h-1.5 w-1.5 rounded-full",
                                                isBusy ? "bg-amber-400 animate-pulse" : "bg-emerald-500"
                                            )}></span>
                                            <span className="text-[10px] text-slate-400 font-medium uppercase font-mono">
                                                {isBusy ? 'En Intervention' : 'Disponible'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <ChevronRight className="h-4 w-4 text-slate-200 group-hover:text-blue-400 transition-colors" />
                            </div>

                            {activeJob && (
                                <div className="mt-3 p-3 rounded-xl bg-amber-50/50 border border-amber-100 space-y-2">
                                    <div className="flex items-center gap-2 text-[10px] font-bold text-amber-700">
                                        <Activity className="h-3 w-3" />
                                        MISSION EN COURS
                                    </div>
                                    <p className="text-[11px] font-semibold text-slate-700 leading-tight line-clamp-2">
                                        {activeJob.description || 'Intervention technique'}
                                    </p>
                                    <div className="flex items-center justify-between pt-1">
                                        <div className="flex items-center gap-1 text-[10px] text-slate-400">
                                            <MapPin className="h-3 w-3" />
                                            <span>Site {activeJob.machine?.model || 'Alpha'}</span>
                                        </div>
                                        <div className="flex items-center gap-1 text-[10px] text-slate-400">
                                            <Clock className="h-3 w-3" />
                                            <span>Depuis 2h</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {!isBusy && (
                                <div className="mt-2 flex gap-1 items-center">
                                     <Badge variant="outline" className="text-[9px] border-slate-100 text-slate-400 px-1 py-0 h-4">
                                        ZONE NORD
                                     </Badge>
                                     <Badge variant="outline" className="text-[9px] border-slate-100 text-slate-400 px-1 py-0 h-4">
                                        V7-CERTIFIED
                                     </Badge>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Quick Actions Footer */}
            <div className="p-4 bg-white border-t border-slate-200">
                <button className="w-full py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors shadow-lg shadow-slate-200">
                    Dépêcher un Technicien
                </button>
            </div>
        </div>
    );
}
