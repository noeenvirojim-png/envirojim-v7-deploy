'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserPlus, Mail, Building2, Loader2, CheckCircle2, Send } from 'lucide-react';
import { toast } from 'sonner';

export default function ClientOnboardingForm({ onClientCreated }: { onClientCreated?: () => void }) {
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        organization: ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await fetch('/api/admin/clients', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const data = await res.json();
            if (data.success) {
                setSuccess(true);
                toast.success('Client créé avec succès');
                if (onClientCreated) onClientCreated();
                // Invite generation will be handled separately in the list
            } else {
                toast.error(data.error || 'Erreur lors de la création');
            }
        } catch (err) {
            toast.error('Erreur technique');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <Card className="border-emerald-100 bg-emerald-50/20 shadow-xl p-8 text-center space-y-4 animate-in zoom-in-95">
                <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-200">
                    <CheckCircle2 className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-2xl font-black text-slate-900 leading-none">Client Enregistré</h2>
                <p className="text-slate-500 font-medium">Le client a été ajouté à la base de données. Vous pouvez maintenant envoyer l'invitation OAuth.</p>
                <Button variant="outline" className="rounded-xl" onClick={() => { setSuccess(false); setFormData({ name: '', email: '', organization: '' }); }}>
                    AJOUTER UN AUTRE CLIENT
                </Button>
            </Card>
        );
    }

    return (
        <Card className="border-slate-200 shadow-2xl bg-white/80 backdrop-blur-xl overflow-hidden glass-effect">
            <div className="bg-slate-900 p-6 text-white">
                <div className="flex items-center gap-3">
                    <UserPlus className="w-6 h-6 text-blue-400" />
                    <div>
                        <h2 className="text-xl font-black uppercase tracking-tight">Nouvel Onboarding Client</h2>
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest leading-none mt-1">V8 Industrial Standard</p>
                    </div>
                </div>
            </div>
            <CardContent className="p-8">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="name" className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 pl-1">Nom Complet / Raison Sociale</Label>
                        <div className="relative">
                            <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <Input 
                                id="name"
                                className="h-14 pl-12 rounded-2xl border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all font-medium"
                                placeholder="ex: Acme Mining Corp"
                                required
                                value={formData.name}
                                onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 pl-1">Adresse Email Professionnelle</Label>
                        <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <Input 
                                id="email"
                                type="email"
                                className="h-14 pl-12 rounded-2xl border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all font-medium"
                                placeholder="client@acme.com"
                                required
                                value={formData.email}
                                onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                            />
                        </div>
                    </div>

                    <div className="pt-4">
                        <Button 
                            type="submit" 
                            disabled={loading}
                            className="w-full h-16 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl shadow-xl shadow-blue-100 font-black text-lg transition-all active:scale-95"
                        >
                            {loading ? <Loader2 className="animate-spin w-6 h-6" /> : "INITIALISER LE CLIENT"}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}
