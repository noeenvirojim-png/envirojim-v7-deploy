'use client';

import React, { useState } from 'react';
import { Calendar as CalendarIcon, Clock, Move, User, GripVertical } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function TechnicianSchedulePage() {
    const [view, setView] = useState<'DAY' | 'WEEK'>('DAY');

    // Mocks for interactive UI demonstration (as Server Actions handle the real DB sync)
    const [tasks, setTasks] = useState([
        { id: '1', title: 'Inspection Préventive 500h', tech: 'Jean Dupont', type: 'MAINTENANCE', time: '08:00', duration: 2 },
        { id: '2', title: 'Remplacement Filtre Hyd.', tech: 'Marc Martin', type: 'TICKET', time: '10:30', duration: 1.5 },
        { id: '3', title: 'DIAGNOSTIC IA - Perte Puissance', tech: 'Jean Dupont', type: 'DIAGNOSTIC', time: '13:00', duration: 3 },
    ]);

    const handleDragStart = (e: React.DragEvent, taskId: string) => {
        e.dataTransfer.setData('taskId', taskId);
    };

    const handleDrop = (e: React.DragEvent, newTimeSlot: string) => {
        const taskId = e.dataTransfer.getData('taskId');
        setTasks(tasks.map(t => t.id === taskId ? { ...t, time: newTimeSlot } : t));
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const timeSlots = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex items-center justify-between border-b pb-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">Planning Techniciens</h1>
                    <p className="text-slate-500 mt-1">Gérez les assignations et visualisez la charge de la flotte.</p>
                </div>
                <div className="flex bg-slate-100 p-1 rounded-lg">
                    <Button
                        variant={view === 'DAY' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setView('DAY')}
                        className="rounded-md"
                    >
                        Vue Jour
                    </Button>
                    <Button
                        variant={view === 'WEEK' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setView('WEEK')}
                        className="rounded-md"
                    >
                        Vue Semaine
                    </Button>
                </div>
            </div>

            <div className="flex gap-6 h-[700px]">
                {/* Timeline Grid */}
                <div className="flex-1 bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col shadow-sm">
                    <div className="h-12 border-b border-slate-200 bg-slate-50 flex items-center px-4 font-semibold text-slate-700">
                        <CalendarIcon className="mr-2 h-5 w-5 text-slate-400" />
                        {view === 'DAY' ? "Aujourd'hui" : "Semaine en cours"}
                    </div>

                    <div className="flex-1 overflow-y-auto relative p-4">
                        {timeSlots.map((slot) => (
                            <div
                                key={slot}
                                className="flex min-h-[100px] border-b border-slate-100 group transition-colors hover:bg-slate-50"
                                onDragOver={handleDragOver}
                                onDrop={(e) => handleDrop(e, slot)}
                            >
                                <div className="w-20 text-sm font-medium text-slate-400 pt-2 shrink-0">
                                    {slot}
                                </div>
                                <div className="flex-1 relative flex flex-wrap gap-2 p-2">
                                    {tasks.filter(t => t.time.startsWith(slot.split(':')[0])).map(task => (
                                        <div
                                            key={task.id}
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, task.id)}
                                            className="w-full sm:w-[calc(50%-0.5rem)] bg-white border border-slate-200 rounded-lg shadow-sm p-3 cursor-grab active:cursor-grabbing hover:border-blue-400 hover:shadow-md transition-all relative border-l-4 border-l-blue-500"
                                        >
                                            <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <GripVertical className="h-4 w-4 text-slate-300" />
                                            </div>
                                            <h4 className="font-bold text-slate-800 text-sm">{task.title}</h4>
                                            <div className="flex items-center gap-4 mt-2 text-xs font-medium text-slate-500">
                                                <span className="flex items-center"><User className="mr-1 h-3 w-3" />{task.tech}</span>
                                                <span className="flex items-center"><Clock className="mr-1 h-3 w-3" />{task.duration}h</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Unassigned Tickets Panel */}
                <div className="w-80 bg-slate-50 rounded-xl border border-slate-200 p-4 shrink-0 flex flex-col">
                    <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <Move className="h-4 w-4 text-slate-500" /> À Planifier
                    </h3>

                    <div className="space-y-3 overflow-y-auto flex-1 pr-1">
                        {[
                            { id: 'u1', title: 'Inspection Générale - EX800', type: 'TICKET' },
                            { id: 'u2', title: 'Intervention Suite IA - CH500', type: 'DIAGNOSTIC' },
                        ].map(t => (
                            <Card key={t.id} draggable className="cursor-grab active:cursor-grabbing hover:border-blue-300">
                                <CardContent className="p-3">
                                    <div className="flex items-start justify-between">
                                        <p className="font-semibold text-sm">{t.title}</p>
                                        <span className="bg-slate-100 text-slate-600 text-[10px] px-1.5 py-0.5 rounded uppercase font-bold">{t.type}</span>
                                    </div>
                                    <p className="text-xs text-slate-400 mt-2">Faites glisser dans le calendrier</p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
