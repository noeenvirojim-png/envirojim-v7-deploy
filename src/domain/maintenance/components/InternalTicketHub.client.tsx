'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MessageSquare, ArrowRight, Clock, AlertTriangle } from 'lucide-react';

export function InternalTicketHub({ tickets }: { tickets: any[] }) {
    return (
        <div className="space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Tickets Internes & Superviseur</h3>
            
            <div className="space-y-3">
                {tickets.length > 0 ? (
                    tickets.map((t) => (
                        <Card key={t.id} className="border-slate-200">
                            <CardContent className="p-4 flex items-center justify-between">
                                <div className="flex gap-4 items-center">
                                    <div className={`p-2 rounded-lg ${t.status === 'OPEN' ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'}`}>
                                        <AlertTriangle className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h4 className="text-sm font-bold text-slate-900">{t.title}</h4>
                                            <Badge variant={t.status === 'OPEN' ? 'warning' : 'info'} className="text-[10px] h-4">
                                                {t.status}
                                            </Badge>
                                        </div>
                                        <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                                            <Clock className="w-3 h-3" /> Créé il y a 2h • {t.notes_vocal?.length || 0} Notes Vocales
                                        </p>
                                    </div>
                                </div>
                                <Button size="sm" variant="ghost" className="text-blue-600 font-bold hover:text-blue-700">
                                    Réviser <ArrowRight className="w-4 h-4 ml-2" />
                                </Button>
                            </CardContent>
                        </Card>
                    ))
                ) : (
                    <div className="p-8 text-center border-2 border-dashed border-slate-100 rounded-xl">
                        <MessageSquare className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                        <p className="text-sm text-slate-400">Aucun ticket interne en attente de révision.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
