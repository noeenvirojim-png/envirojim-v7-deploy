'use client';

import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Send, CheckCircle2, Ghost } from 'lucide-react';
import { toast } from 'sonner';

interface ClientV8 {
    id: string;
    name: string;
    email: string;
    status: 'PENDING' | 'ACTIVE';
    created_at: string;
}

export function ClientsListV8() {
    const [clients, setClients] = useState<ClientV8[]>([]);
    const [loading, setLoading] = useState(true);
    const [invitingId, setInvitingId] = useState<string | null>(null);

    const loadClients = async () => {
        try {
            const res = await fetch('/api/admin/clients');
            const data = await res.json();
            if (data.clients) setClients(data.clients);
        } catch (err) {
            toast.error('Erreur lors du chargement des clients');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadClients();
    }, []);

    const sendInvitation = async (clientId: string) => {
        setInvitingId(clientId);
        try {
            const res = await fetch('/api/send-client-link', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ clientId })
            });

            if (res.ok) {
                toast.success('Lien d\'invitation envoyé avec succès');
            } else {
                toast.error('Erreur lors de l\'envoi de l\'invitation');
            }
        } catch (err) {
            toast.error('Erreur technique');
        } finally {
            setInvitingId(null);
        }
    };

    if (loading) {
        return (
            <div className="bg-white border border-slate-200 rounded-2xl h-[400px] flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xl glass-effect">
            <div className="p-6 border-b border-slate-50 flex items-center justify-between">
                <div>
                    <h3 className="font-black text-slate-900 uppercase tracking-tight">Flux d'Invitation V8</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Temps réel / Audit actif</p>
                </div>
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-100 font-black">
                    {clients.length} CLIENTS
                </Badge>
            </div>
            
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50/50 border-b border-slate-100">
                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Client</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Statut</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {clients.map((client) => (
                            <tr key={client.id} className="group hover:bg-slate-50/30 transition-all">
                                <td className="px-6 py-5">
                                    <div>
                                        <p className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{client.name}</p>
                                        <p className="text-xs text-slate-500 font-medium">{client.email}</p>
                                    </div>
                                </td>
                                <td className="px-6 py-5">
                                    {client.status === 'ACTIVE' ? (
                                        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 font-black text-[10px] rounded-md px-2">
                                            <CheckCircle2 className="w-3 h-3 mr-1" /> ACTIVÉ
                                        </Badge>
                                    ) : (
                                        <Badge variant="secondary" className="bg-amber-50 text-amber-700 border-amber-100 font-black text-[10px] rounded-md px-2">
                                            EN ATTENTE
                                        </Badge>
                                    )}
                                </td>
                                <td className="px-6 py-5 text-right">
                                    <Button 
                                        variant="outline" 
                                        size="sm"
                                        disabled={invitingId === client.id}
                                        onClick={() => sendInvitation(client.id)}
                                        className="rounded-xl border-blue-200 text-blue-600 font-black text-[10px] uppercase hover:bg-blue-50 hover:border-blue-300 transition-all active:scale-95 px-4 h-9 shadow-sm"
                                    >
                                        {invitingId === client.id ? <Loader2 className="w-3 h-3 animate-spin" /> : (
                                            <>
                                                <Send className="w-3 h-3 mr-2" />
                                                Inviter
                                            </>
                                        )}
                                    </Button>
                                </td>
                            </tr>
                        ))}
                        {clients.length === 0 && (
                            <tr>
                                <td colSpan={3} className="py-20 text-center">
                                    <div className="flex flex-col items-center opacity-40">
                                        <Ghost className="w-12 h-12 mb-4" />
                                        <p className="font-black uppercase tracking-widest text-xs">Aucun client à onboarder</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
