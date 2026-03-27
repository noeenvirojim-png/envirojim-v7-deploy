'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { DICTIONARY } from '@/lib/i18n/dict';
import { Badge } from '@/components/ui/badge';
import { useRuntimeValidation } from '@/hooks/useRuntimeValidation';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

// Strict Types
type TicketPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';

interface Ticket {
    id: string;
    title: string;
    description: string | null;
    priority: TicketPriority;
    status: TicketStatus;
    organization_id: string;
    created_at: string;
}

interface TicketFormData {
    title: string;
    description: string;
    priority: TicketPriority;
    status: TicketStatus;
}

export function TicketsUI() {
    // State
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(true);
    const { health } = useRuntimeValidation();
    const t = DICTIONARY.fr;

    // Modal & Action State
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [currentTicket, setCurrentTicket] = useState<Ticket | null>(null);
    const [submitting, setSubmitting] = useState(false);

    // Form Data
    const defaultFormData: TicketFormData = {
        title: '',
        description: '',
        priority: 'NORMAL',
        status: 'OPEN'
    };
    const [formData, setFormData] = useState<TicketFormData>(defaultFormData);

    // Load Tickets with AbortControl
    const loadTickets = useCallback(async () => {
        const controller = new AbortController();
        const signal = controller.signal;

        try {
            setLoading(true);
            const response = await fetch('/api/tickets', {
                method: 'GET',
                signal,
                headers: { 'Accept': 'application/json' },
                credentials: 'include',
                cache: 'no-store'
            });

            if (!response.ok) {
                const text = await response.text();
                throw new Error(text || `HTTP Error ${response.status}`);
            }

            const result = await response.json();

            if (!result.success || !Array.isArray(result.data)) {
                throw new Error(result.error || 'Format de réponse invalide');
            }

            setTickets(result.data);
        } catch (err: unknown) {
            if (err instanceof Error && err.name === 'AbortError') return;
            console.error('Fetch error:', err);
            toast.error('Impossible de charger les tickets.');
        } finally {
            if (!signal.aborted) {
                setLoading(false);
            }
        }

        return () => controller.abort();
    }, []);

    useEffect(() => {
        const abortFn = loadTickets();
        return () => { abortFn.then(fn => fn && fn()); };
    }, [loadTickets]);

    const resetForm = () => {
        setFormData(defaultFormData);
        setCurrentTicket(null);
    };

    const handleCreate = async () => {
        if (submitting) return;

        // Basic client-side validation
        if (!formData.title.trim()) {
            toast.error('Le titre est requis');
            return;
        }

        setSubmitting(true);
        try {
            const res = await fetch('/api/tickets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                cache: 'no-store',
                body: JSON.stringify(formData)
            });

            const json = await res.json();

            if (!res.ok || !json.success) {
                throw new Error(json.error || 'Erreur lors de la création');
            }

            // Safe update
            setTickets(prev => [json.data, ...prev]);

            setIsCreateOpen(false);
            resetForm();
            toast.success('Ticket créé avec succès');
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : 'Erreur inconnue';
            toast.error(msg);
        } finally {
            setSubmitting(false);
        }
    };

    const handleUpdate = async () => {
        if (!currentTicket || submitting) return;

        setSubmitting(true);
        try {
            const res = await fetch('/api/tickets', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                cache: 'no-store',
                body: JSON.stringify({ id: currentTicket.id, ...formData })
            });

            const json = await res.json();

            if (!res.ok || !json.success) {
                throw new Error(json.error || 'Erreur lors de la mise à jour');
            }

            // Functional update to avoid race conditions
            setTickets(prev => prev.map(t => t.id === currentTicket.id ? json.data : t));

            setIsEditOpen(false);
            resetForm();
            toast.success('Ticket mis à jour');
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : 'Erreur inconnue';
            toast.error(msg);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        // No double confirm if already handling
        const isConfirmed = window.confirm('Êtes-vous sûr de vouloir supprimer ce ticket ?');
        if (!isConfirmed) return;

        // Optimistic Update
        const previousTickets = [...tickets];
        setTickets(prev => prev.filter(t => t.id !== id));

        try {
            const res = await fetch(`/api/tickets?id=${id}`, {
                method: 'DELETE',
                credentials: 'include',
                cache: 'no-store'
            });

            const json = await res.json();

            if (!res.ok || !json.success) {
                throw new Error(json.error || 'Erreur lors de la suppression');
            }

            toast.success('Ticket supprimé');
        } catch (error: unknown) {
            // Rollback on error
            setTickets(previousTickets);
            const msg = error instanceof Error ? error.message : 'Erreur inconnue';
            toast.error(msg);
        }
    };

    const openEdit = (ticket: Ticket) => {
        setCurrentTicket(ticket);
        setFormData({
            title: ticket.title,
            description: ticket.description || '',
            priority: ticket.priority,
            status: ticket.status
        });
        setIsEditOpen(true);
    };

    const getPriorityColor = (p: TicketPriority) => {
        switch (p) {
            case 'URGENT': return 'text-red-600';
            case 'HIGH': return 'text-orange-500';
            case 'LOW': return 'text-slate-400';
            default: return 'text-slate-500'; // NORMAL
        }
    };

    const getStatusVariant = (s: TicketStatus) => {
        switch (s) {
            case 'OPEN': return 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100';
            case 'IN_PROGRESS': return 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100';
            case 'RESOLVED': return 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100';
            case 'CLOSED': return 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200';
            default: return 'bg-gray-50 text-gray-600 border-gray-200';
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight text-primary">{t.nav_tickets}</h1>
                <Dialog open={isCreateOpen} onOpenChange={open => { if (!submitting) setIsCreateOpen(open); if (!open) resetForm(); }}>
                    <DialogTrigger asChild>
                        <Button onClick={resetForm} className="shadow-sm gap-2">
                            <Plus size={16} /> {t.btn_create}
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Nouveau Ticket</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="create-title">Titre</Label>
                                <Input
                                    id="create-title"
                                    value={formData.title}
                                    onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                                    placeholder="Ex: Panne machine #123"
                                    disabled={submitting}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="create-desc">Description</Label>
                                <Textarea
                                    id="create-desc"
                                    value={formData.description}
                                    onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                    placeholder="Détails du problème..."
                                    disabled={submitting}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Priorité</Label>
                                    <Select
                                        value={formData.priority}
                                        onValueChange={(v: TicketPriority) => setFormData(prev => ({ ...prev, priority: v }))}
                                        disabled={submitting}
                                    >
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="LOW">Basse</SelectItem>
                                            <SelectItem value="NORMAL">Normale</SelectItem>
                                            <SelectItem value="HIGH">Haute</SelectItem>
                                            <SelectItem value="URGENT">Urgente</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Statut</Label>
                                    <Select
                                        value={formData.status}
                                        onValueChange={(v: TicketStatus) => setFormData(prev => ({ ...prev, status: v }))}
                                        disabled={submitting}
                                    >
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="OPEN">Ouvert</SelectItem>
                                            <SelectItem value="IN_PROGRESS">En cours</SelectItem>
                                            <SelectItem value="RESOLVED">Résolu</SelectItem>
                                            <SelectItem value="CLOSED">Fermé</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
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

                {/* Edit Modal */}
                <Dialog open={isEditOpen} onOpenChange={open => { if (!submitting) setIsEditOpen(open); }}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Modifier le Ticket</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit-title">Titre</Label>
                                <Input
                                    id="edit-title"
                                    value={formData.title}
                                    onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                                    disabled={submitting}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-desc">Description</Label>
                                <Textarea
                                    id="edit-desc"
                                    value={formData.description}
                                    onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                    disabled={submitting}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Priorité</Label>
                                    <Select
                                        value={formData.priority}
                                        onValueChange={(v: TicketPriority) => setFormData(prev => ({ ...prev, priority: v }))}
                                        disabled={submitting}
                                    >
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="LOW">Basse</SelectItem>
                                            <SelectItem value="NORMAL">Normale</SelectItem>
                                            <SelectItem value="HIGH">Haute</SelectItem>
                                            <SelectItem value="URGENT">Urgente</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Statut</Label>
                                    <Select
                                        value={formData.status}
                                        onValueChange={(v: TicketStatus) => setFormData(prev => ({ ...prev, status: v }))}
                                        disabled={submitting}
                                    >
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="OPEN">Ouvert</SelectItem>
                                            <SelectItem value="IN_PROGRESS">En cours</SelectItem>
                                            <SelectItem value="RESOLVED">Résolu</SelectItem>
                                            <SelectItem value="CLOSED">Fermé</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsEditOpen(false)} disabled={submitting}>Annuler</Button>
                            <Button onClick={handleUpdate} disabled={submitting}>
                                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Enregistrer
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Runtime Health Banner */}
            {health && health.status !== 'ok' && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 animate-in fade-in slide-in-from-top-2 duration-500">
                    <div className="flex items-start gap-3">
                        <div className="mt-0.5 text-amber-600">
                            <Loader2 className="h-5 w-5 animate-spin" />
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-amber-900">Affichage Dégradé (Fail-Safe)</h4>
                            <p className="text-xs text-amber-700 mt-1">
                                {health.invalid} record(s) masqués.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm">
                <table data-testid="tickets-table" className="w-full text-left text-sm">
                    <thead className="bg-slate-50/50 text-slate-400 uppercase text-xs font-semibold">
                        <tr>
                            <th className="px-6 py-4">Titre / Description</th>
                            <th className="px-6 py-4">Priorité</th>
                            <th className="px-6 py-4">Statut</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-12 text-center">
                                    <div className="flex items-center justify-center gap-2 text-slate-400 italic">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Chargement...
                                    </div>
                                </td>
                            </tr>
                        ) : tickets.length > 0 ? (
                            tickets.map((ticket) => (
                                <tr key={ticket.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-5">
                                        <div className="font-semibold text-slate-900">{ticket.title}</div>
                                        <div className="text-xs text-slate-500 line-clamp-1 mt-0.5">{ticket.description}</div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <span className={`text-xs font-mono font-bold ${getPriorityColor(ticket.priority)}`}>
                                            {ticket.priority}
                                        </span>
                                    </td>
                                    <td className="px-6 py-5">
                                        <Badge variant="outline" className={getStatusVariant(ticket.status)}>
                                            {ticket.status}
                                        </Badge>
                                    </td>
                                    <td className="px-6 py-5 text-right flex justify-end gap-2">
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-8 w-8 text-slate-400 hover:text-blue-600"
                                            onClick={() => openEdit(ticket)}
                                        >
                                            <Pencil size={16} />
                                        </Button>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-8 w-8 text-slate-400 hover:text-red-600"
                                            onClick={() => handleDelete(ticket.id)}
                                        >
                                            <Trash2 size={16} />
                                        </Button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={4} className="px-6 py-12 text-center text-slate-400 italic">
                                    Aucun ticket trouvé.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
