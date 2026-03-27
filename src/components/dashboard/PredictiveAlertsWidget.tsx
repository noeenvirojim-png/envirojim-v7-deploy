'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Brain, AlertTriangle, ArrowRight, Loader2, Gauge } from 'lucide-react';
import { getFleetPredictiveAlerts, FleetAlert } from '@/domain/diagnosis/actions/fleet';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function PredictiveAlertsWidget() {
    const [alerts, setAlerts] = useState<FleetAlert[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadAlerts() {
            const res = await getFleetPredictiveAlerts();
            if (res.success && res.alerts) {
                setAlerts(res.alerts);
            }
            setLoading(false);
        }
        loadAlerts();
    }, []);

    if (loading) {
        return (
            <Card className="border-slate-200 shadow-sm animate-pulse">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Brain className="h-5 w-5 text-blue-500" />
                        Intelligence Flotte
                    </CardTitle>
                </CardHeader>
                <CardContent className="h-[300px] flex items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="border-indigo-100 shadow-md bg-white overflow-hidden">
            <CardHeader className="bg-indigo-50/50 border-b border-indigo-100/50">
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle className="text-lg flex items-center gap-2 text-indigo-900">
                            <Brain className="h-5 w-5 text-indigo-600" />
                            Alertes Prédictives AI
                        </CardTitle>
                        <CardDescription className="text-indigo-700/70">
                            Composants à risque identifiés par l'analyse de flotte.
                        </CardDescription>
                    </div>
                    <Badge variant="secondary" className="bg-indigo-600 text-white border-none">
                        PROBABLE
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                {alerts.length > 0 ? (
                    <div className="divide-y divide-slate-100">
                        {alerts.map((alert) => (
                            <div key={alert.id} className="p-4 hover:bg-slate-50 transition-colors group">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-2">
                                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                                        <span className="font-bold text-slate-900">{alert.risk_component}</span>
                                    </div>
                                    <Badge variant="outline" className="text-[10px] uppercase tracking-wider border-slate-200">
                                        Risque: {alert.probability}%
                                    </Badge>
                                </div>
                                <p className="text-xs text-slate-500 font-medium mb-3 uppercase flex items-center gap-1">
                                    <Gauge className="w-3 h-3" /> {alert.machine_name}
                                </p>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-[10px] font-bold text-indigo-900/60 uppercase">
                                        <span>Indice de risque interne</span>
                                        <span>Stable</span>
                                    </div>
                                    <Progress value={alert.probability} className="h-1.5 bg-slate-100" />
                                </div>
                                <div className="mt-4 flex justify-between items-center">
                                    <p className="text-sm text-slate-700 italic">"{alert.recommended_action}"</p>
                                    <Link href={`/dashboard/machines/${alert.machine_id}`}>
                                        <Button variant="ghost" size="sm" className="h-8 text-xs text-indigo-600 group-hover:translate-x-1 transition-transform">
                                            Détails <ArrowRight className="ml-1 w-3 h-3" />
                                        </Button>
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center p-12 text-center">
                        <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mb-4">
                            <Gauge className="h-6 w-6 text-green-500" />
                        </div>
                        <p className="text-slate-500 font-medium">Santé de la flotte optimale.</p>
                        <p className="text-xs text-slate-400">Aucun pattern de panne récurrent détecté.</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
