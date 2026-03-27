'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Circle, AlertCircle, Camera, Mic } from 'lucide-react';
import { ChecklistInstance, ChecklistType } from '@/types/schema';

export function DailyChecklistHub({ machineId, initialChecklists }: { machineId: string, initialChecklists: any[] }) {
    const [checklists, setChecklists] = useState(initialChecklists);

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900">Checklists Quotidiennes</h3>
                <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="text-xs h-8">
                        Historique
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {['MORNING', 'EVENING'].map((type) => {
                    const latest = checklists.find(c => c.type === type);
                    const isDone = latest?.status === 'COMPLETED';
                    
                    return (
                        <Card key={type} className={`border-l-4 ${isDone ? 'border-l-emerald-500' : 'border-l-amber-500'} shadow-sm`}>
                            <CardHeader className="pb-2">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-2">
                                        {isDone ? <CheckCircle2 className="text-emerald-500 w-5 h-5" /> : <Circle className="text-amber-500 w-5 h-5" />}
                                        <CardTitle className="text-sm font-bold uppercase">{type === 'MORNING' ? 'Matin' : 'Soir'}</CardTitle>
                                    </div>
                                    <Badge variant={isDone ? "success" : "warning"}>
                                        {isDone ? 'Terminé' : 'À Faire'}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <p className="text-xs text-slate-500 mb-4">
                                    {isDone 
                                        ? `Complété à ${new Date(latest.completed_at).toLocaleTimeString()}`
                                        : 'Inspection quotidienne requise'}
                                </p>
                                <Button 
                                    className="w-full text-xs font-bold" 
                                    variant={isDone ? "outline" : "default"}
                                >
                                    {isDone ? 'Voir Résumé' : 'Démarrer Inspection'}
                                </Button>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}
