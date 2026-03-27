'use client'

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Clock, AlertCircle, ChevronRight, User, Settings } from 'lucide-react';
import { Ticket } from '@/types/schema';
import { cn } from '@/lib/utils';

interface TicketInboxProps {
    tickets: any[];
}

export default function TicketInbox({ tickets }: TicketInboxProps) {
    const [selectedId, setSelectedId] = useState<string | null>(tickets.length > 0 ? tickets[0].id : null);
    const selectedTicket = tickets.find(t => t.id === selectedId);

    const getStatusColor = (status: string) => {
        switch (status.toUpperCase()) {
            case 'OPEN': return 'bg-red-100 text-red-700 border-red-200';
            case 'IN_PROGRESS': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'RESOLVED': return 'bg-green-100 text-green-700 border-green-200';
            case 'CLOSED': return 'bg-slate-100 text-slate-700 border-slate-200';
            default: return 'bg-slate-100 text-slate-700 border-slate-200';
        }
    };

    const getPriorityIcon = (priority: string) => {
        if (priority === 'URGENT' || priority === 'HIGH') 
            return <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />;
        return null;
    };

    return (
        <div className="flex flex-1 gap-6 overflow-hidden h-full min-h-0">
            {/* List Sidebar */}
            <div className="w-1/3 min-w-[350px] border border-slate-200 rounded-2xl bg-slate-50 flex flex-col overflow-hidden shadow-sm">
                <div className="p-4 border-b border-slate-200 bg-white flex justify-between items-center">
                    <h2 className="font-semibold text-slate-800">Boîte de réception</h2>
                    <Badge variant="secondary" className="bg-slate-100">{tickets.length}</Badge>
                </div>

                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                    {tickets.map(ticket => (
                        <div 
                            key={ticket.id} 
                            onClick={() => setSelectedId(ticket.id)}
                            className={cn(
                                "p-4 rounded-xl border transition-all cursor-pointer relative group",
                                selectedId === ticket.id 
                                    ? "bg-white border-blue-500 shadow-md ring-1 ring-blue-500/20" 
                                    : "bg-white border-slate-200 shadow-sm hover:border-blue-300 hover:shadow-md"
                            )}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-2">
                                    {getPriorityIcon(ticket.priority)}
                                    <Badge variant="outline" className={cn("text-[10px] font-bold", getStatusColor(ticket.status))}>
                                        {ticket.status}
                                    </Badge>
                                </div>
                                <span className="text-[10px] text-slate-400 flex items-center">
                                    <Clock className="h-3 w-3 mr-1" />
                                    {new Date(ticket.created_at).toLocaleDateString()}
                                </span>
                            </div>
                            <h3 className="font-bold text-slate-800 text-sm mb-1 line-clamp-1">{ticket.title}</h3>
                            {ticket.machine && (
                                <p className="text-[11px] text-slate-500 font-medium mb-1">
                                    {ticket.machine.make} {ticket.machine.model}
                                </p>
                            )}
                            <div className="flex justify-between items-center mt-3 pt-2 border-t border-slate-50">
                                <span className="text-[10px] text-slate-400">Par {ticket.creator?.full_name || 'Système'}</span>
                                <ChevronRight className={cn("h-4 w-4 transition-transform", selectedId === ticket.id ? "text-blue-500 translate-x-1" : "text-slate-200")} />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Detail View */}
            <div className="flex-1 border border-slate-200 rounded-2xl bg-white flex flex-col overflow-hidden shadow-sm">
                {selectedTicket ? (
                    <div className="flex flex-col h-full">
                        {/* Header */}
                        <div className="p-6 border-b border-slate-100 flex justify-between items-start bg-slate-50/30">
                            <div>
                                <div className="flex items-center gap-3 mb-2">
                                    <Badge className={cn("rounded-md", getStatusColor(selectedTicket.status))}>
                                        {selectedTicket.status}
                                    </Badge>
                                    <span className="text-sm text-slate-400">#{selectedTicket.id.split('-')[0]}</span>
                                </div>
                                <h2 className="text-xl font-bold text-slate-900">{selectedTicket.title}</h2>
                            </div>
                            <div className="flex items-center gap-2">
                                <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-400">
                                    <Settings className="h-5 w-5" />
                                </button>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-8">
                            {/* Meta Info */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Machine</p>
                                    <p className="font-semibold text-slate-700">
                                        {selectedTicket.machine ? `${selectedTicket.machine.make} ${selectedTicket.machine.model}` : 'N/A'}
                                    </p>
                                    <p className="text-xs text-slate-500">{selectedTicket.machine?.serial_number}</p>
                                </div>
                                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Assigné à</p>
                                    <div className="flex items-center gap-2">
                                        <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center text-[10px] font-bold text-blue-600">
                                            {selectedTicket.assignee?.full_name?.charAt(0) || <User className="h-3 w-3" />}
                                        </div>
                                        <p className="font-medium text-slate-700 text-sm">
                                            {selectedTicket.assignee?.full_name || 'Non assigné'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Description */}
                            <div className="space-y-3">
                                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                                    <MessageSquare className="h-4 w-4 text-blue-500" />
                                    Description initiale
                                </h3>
                                <div className="p-5 rounded-2xl bg-white border border-slate-200 text-slate-600 text-sm leading-relaxed shadow-sm">
                                    {selectedTicket.description}
                                </div>
                            </div>

                            {/* Thread Placeholder */}
                            <div className="space-y-4">
                                <h3 className="font-bold text-slate-800 text-sm">Activité & Commentaires</h3>
                                <div className="relative border-l-2 border-slate-100 ml-4 pl-8 space-y-6">
                                    <div className="relative">
                                        <div className="absolute -left-[41px] top-0 h-6 w-6 rounded-full bg-blue-500 border-4 border-white shadow-sm flex items-center justify-center">
                                            <div className="h-1 w-1 rounded-full bg-white"></div>
                                        </div>
                                        <div className="bg-slate-50 p-4 rounded-xl text-xs text-slate-500 italic">
                                            Le fil de discussion IA et les mises à jour de statut apparaîtront ici.
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Reply Area Placeholder */}
                        <div className="p-4 bg-slate-50 border-t border-slate-100">
                             <div className="flex gap-3">
                                <input 
                                    disabled
                                    className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none placeholder:text-slate-300"
                                    placeholder="Répondre au ticket... (Bientôt disponible)"
                                />
                                <button disabled className="bg-blue-600/50 text-white px-4 py-2 rounded-xl text-sm font-medium">
                                    Envoyer
                                </button>
                             </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col h-full items-center justify-center text-slate-400 pattern-grid-lg">
                        <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100">
                            <MessageSquare className="h-8 w-8 text-slate-300" />
                        </div>
                        <p className="font-medium text-slate-500 text-lg">Sélectionnez un ticket pour afficher les détails</p>
                    </div>
                )}
            </div>
        </div>
    );
}
