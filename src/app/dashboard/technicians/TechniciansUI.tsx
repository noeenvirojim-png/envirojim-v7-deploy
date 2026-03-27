'use client'

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Plus, UserCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export function TechniciansUI() {
    const [technicians, setTechnicians] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [form, setForm] = useState({ full_name: '', email: '', phone: '' });

    useEffect(() => {
        async function load() {
            try {
                const response = await fetch('/api/technicians');
                const result = await response.json();
                if (result.success) {
                    setTechnicians(result.data);
                } else {
                    console.error('Failed to load technicians:', result.error);
                    toast.error('Failed to load technicians');
                }
            } catch (err) {
                console.error('Failed to load technicians', err);
                toast.error('Network error loading technicians');
            } finally {
                setLoading(false);
            }
        }
        load();
    }, []);

    const resetForm = () => setForm({ full_name: '', email: '', phone: '' });

    const handleCreate = async () => {
        if (submitting) return;
        if (!form.full_name.trim()) { toast.error('Full name is required'); return; }
        if (!form.email.trim()) { toast.error('Email is required'); return; }

        setSubmitting(true);
        try {
            const res = await fetch('/api/technicians', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(form)
            });
            const json = await res.json();
            if (!res.ok || !json.success) throw new Error(json.error || 'Failed to create technician');

            setTechnicians(prev => [json.data, ...prev]);
            setIsCreateOpen(false);
            resetForm();
            toast.success('Technicien créé avec succès');
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : 'Unknown error';
            toast.error(msg);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in py-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight text-primary">Techniciens</h1>
                <Button variant="industrial" onClick={() => { resetForm(); setIsCreateOpen(true); }} className="gap-2">
                    <Plus size={16} /> Nouveau Technicien
                </Button>
            </div>

            {/* Create Modal */}
            <Dialog open={isCreateOpen} onOpenChange={(open) => { if (!submitting) { setIsCreateOpen(open); if (!open) resetForm(); } }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Ajouter un Technicien</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="tech-name">Nom complet *</Label>
                            <Input
                                id="tech-name"
                                value={form.full_name}
                                onChange={e => setForm(prev => ({ ...prev, full_name: e.target.value }))}
                                placeholder="Jean Dupont"
                                disabled={submitting}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="tech-email">Email *</Label>
                            <Input
                                id="tech-email"
                                type="email"
                                value={form.email}
                                onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))}
                                placeholder="jean@envirojim.com"
                                disabled={submitting}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="tech-phone">Téléphone</Label>
                            <Input
                                id="tech-phone"
                                value={form.phone}
                                onChange={e => setForm(prev => ({ ...prev, phone: e.target.value }))}
                                placeholder="+1 (514) 555-0000"
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

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {loading ? (
                    <div className="col-span-full py-20 text-center flex items-center justify-center gap-2 text-slate-400 italic">
                        <Loader2 className="h-4 w-4 animate-spin" /> Chargement des techniciens...
                    </div>
                ) : technicians.length > 0 ? (
                    technicians.map((tech: any) => (
                        <div key={tech.id} className="bg-white border border-slate-100 rounded-xl p-6 space-y-4 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-xl bg-primary/5 flex items-center justify-center text-primary font-bold text-xl border border-primary/10">
                                    {tech.fullName?.charAt(0)?.toUpperCase() || <UserCircle2 size={24} />}
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900">{tech.fullName}</h3>
                                    <p className="text-xs text-slate-500 font-medium">{tech.email}</p>
                                    {tech.phone && <p className="text-xs text-slate-400">{tech.phone}</p>}
                                </div>
                            </div>
                            <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
                                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded bg-slate-50 text-slate-400 border border-slate-100">
                                    {tech.organization?.name || 'EnviroJim'}
                                </span>
                                <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider flex items-center gap-1.5">
                                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                    Actif
                                </span>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="col-span-full py-20 text-center text-slate-400 italic">
                        Aucun technicien trouvé. Cliquez sur &quot;Nouveau Technicien&quot; pour en ajouter un.
                    </div>
                )}
            </div>
        </div>
    );
}
