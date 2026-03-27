'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

interface Client {
    id: string;
    name: string;
    type: string;
    qbCustomerId?: string | null;
}

interface ClientForm {
    name: string;
    type: string;
    qb_customer_id: string;
    contact_email: string;
    contact_phone: string;
}

const defaultForm: ClientForm = { name: '', type: 'CLIENT', qb_customer_id: '', contact_email: '', contact_phone: '' };

export function ClientsUI() {
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [form, setForm] = useState<ClientForm>(defaultForm);

    const loadClients = useCallback(async () => {
        try {
            const res = await fetch('/api/clients', { credentials: 'include' });
            const json = await res.json();
            if (json.success) setClients(json.data);
            else toast.error(json.error || 'Failed to load clients');
        } catch {
            toast.error('Network error loading clients');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadClients(); }, [loadClients]);

    const resetForm = () => setForm(defaultForm);

    const handleCreate = async () => {
        if (submitting) return;
        if (!form.name.trim()) { toast.error('Organization name is required'); return; }

        setSubmitting(true);
        try {
            const res = await fetch('/api/clients', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(form)
            });
            const json = await res.json();
            if (!res.ok || !json.success) throw new Error(json.error || 'Failed to create client');

            setClients(prev => [json.data, ...prev]);
            setIsCreateOpen(false);
            resetForm();
            toast.success('Client créé avec succès');
        } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : 'Unknown error');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in py-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight text-primary">Clients</h1>
                <Button variant="industrial" onClick={() => { resetForm(); setIsCreateOpen(true); }} className="gap-2">
                    <Plus size={16} /> Ajouter un Client
                </Button>
            </div>

            {/* Create Modal */}
            <Dialog open={isCreateOpen} onOpenChange={(open) => { if (!submitting) { setIsCreateOpen(open); if (!open) resetForm(); } }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2"><Building2 size={18} /> Nouveau Client</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="client-name">Nom de l&apos;organisation *</Label>
                            <Input
                                id="client-name"
                                value={form.name}
                                onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                                placeholder="Acme Corporation"
                                disabled={submitting}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="client-email">Email de contact</Label>
                            <Input
                                id="client-email"
                                type="email"
                                value={form.contact_email}
                                onChange={e => setForm(prev => ({ ...prev, contact_email: e.target.value }))}
                                placeholder="contact@client.com"
                                disabled={submitting}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="client-phone">Téléphone</Label>
                            <Input
                                id="client-phone"
                                value={form.contact_phone}
                                onChange={e => setForm(prev => ({ ...prev, contact_phone: e.target.value }))}
                                placeholder="+1 (514) 555-0000"
                                disabled={submitting}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="client-qb">ID Client QuickBooks</Label>
                            <Input
                                id="client-qb"
                                value={form.qb_customer_id}
                                onChange={e => setForm(prev => ({ ...prev, qb_customer_id: e.target.value }))}
                                placeholder="QB-12345"
                                disabled={submitting}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreateOpen(false)} disabled={submitting}>Annuler</Button>
                        <Button onClick={handleCreate} disabled={submitting}>
                            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Créer
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50/50 text-slate-400 uppercase text-xs font-semibold">
                        <tr>
                            <th className="px-6 py-4">Nom de l&apos;Organisation</th>
                            <th className="px-6 py-4">Type</th>
                            <th className="px-6 py-4">ID Client QB</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? (
                            <tr><td colSpan={4} className="px-6 py-12 text-center">
                                <div className="flex items-center justify-center gap-2 text-slate-400 italic">
                                    <Loader2 className="h-4 w-4 animate-spin" /> Chargement...
                                </div>
                            </td></tr>
                        ) : clients.length > 0 ? clients.map((client) => (
                            <tr key={client.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-6 py-5 font-semibold text-slate-900">{client.name}</td>
                                <td className="px-6 py-5">
                                    <Badge variant="secondary" className="bg-blue-50 text-blue-600 border-none font-bold text-[10px]">
                                        {client.type}
                                    </Badge>
                                </td>
                                <td className="px-6 py-5 text-slate-400 font-mono text-xs">
                                    {client.qbCustomerId || '-'}
                                </td>
                                <td className="px-6 py-5 text-right">
                                    <Link href={`/dashboard/clients/${client.id}`}>
                                        <Button variant="ghost" size="sm" className="text-primary font-semibold hover:bg-primary/5">
                                            Détails
                                        </Button>
                                    </Link>
                                </td>
                            </tr>
                        )) : (
                            <tr><td colSpan={4} className="px-6 py-20 text-center text-slate-400 italic">
                                Aucun client trouvé. Cliquez sur &quot;Ajouter un Client&quot; pour en créer un.
                            </td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
