import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { User, Shield, Bell, Database, Globe } from 'lucide-react';
import { UsersService } from '@/domain/identity/data/users';
import { SettingsForm } from './SettingsForm.client';

export default async function SettingsPage() {
    const user = await UsersService.getCurrentProfile();

    return (
        <div className="p-8 max-w-4xl mx-auto space-y-10 animate-in-up">
            <div className="space-y-2">
                <h1 className="text-4xl font-black tracking-tight text-slate-900">Paramètres</h1>
                <p className="text-slate-500 text-lg font-medium">Gérez vos informations personnelles et configurez EnviroJim.</p>
            </div>

            <div className="grid gap-8">
                <Card className="rounded-3xl border-slate-200 shadow-sm border-t-4 border-t-slate-900 overflow-hidden">
                    <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-8">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-2xl bg-slate-900 flex items-center justify-center shadow-lg shadow-slate-200">
                                <User className="h-6 w-6 text-white" />
                            </div>
                            <div>
                                <CardTitle className="text-xl font-black text-slate-900">
                                    Profil Utilisateur
                                </CardTitle>
                                <CardDescription className="font-medium text-slate-500">Mettez à jour vos informations de contact.</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-8">
                        {user ? (
                            <SettingsForm user={user} />
                        ) : (
                            <div className="p-4 bg-rose-50 text-rose-700 rounded-xl border border-rose-100 font-bold">
                                Erreur: Impossible de charger votre profil.
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="rounded-3xl border-slate-200 shadow-sm opacity-80">
                    <CardHeader className="p-8 pb-4">
                        <CardTitle className="flex items-center gap-2 text-lg font-bold text-slate-900">
                            <Shield className="h-5 w-5 text-blue-500" />
                            Sécurité & Isolation
                        </CardTitle>
                        <CardDescription className="font-medium">Configuration proactive du périmètre de sécurité.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-8 pt-0">
                        <div className="flex items-center justify-between p-6 bg-slate-50 rounded-2xl border border-slate-100">
                            <div className="space-y-1">
                                <p className="font-black text-slate-900 uppercase tracking-tight text-sm">Mode Zero-Trust Actif</p>
                                <p className="text-sm text-slate-500 font-medium">Vos données sont isolées au niveau de l'organisation.</p>
                            </div>
                            <div className="h-3 w-3 bg-emerald-500 rounded-full animate-pulse shadow-lg shadow-emerald-200" title="Security Active" />
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
