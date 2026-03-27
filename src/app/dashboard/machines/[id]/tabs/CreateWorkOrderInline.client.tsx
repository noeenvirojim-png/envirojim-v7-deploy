'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Loader2, CheckCircle2 } from 'lucide-react';
import { createWorkOrderV9 } from '@/domain/interventions/actions/WorkOrderWorkflow';
import { toast } from 'sonner';

export function CreateWorkOrderInline({ machineId }: { machineId: string }) {
    const [open, setOpen] = useState(false);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [priority, setPriority] = useState<'low' | 'normal' | 'high' | 'urgent'>('normal');
    const [loading, setLoading] = useState(false);
    const [created, setCreated] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return;
        setLoading(true);
        try {
            await createWorkOrderV9({ machineId, title: title.trim(), description: description.trim() || undefined, priority });
            setCreated(true);
            setTitle('');
            setDescription('');
            toast.success('Work order created');
            setTimeout(() => { setCreated(false); setOpen(false); }, 2000);
        } catch (err: any) {
            toast.error(err?.message || 'Failed to create work order');
        } finally {
            setLoading(false);
        }
    };

    if (!open) {
        return (
            <Button
                variant="outline"
                className="w-full border-dashed border-slate-300 text-slate-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-colors h-12"
                onClick={() => setOpen(true)}
            >
                <Plus className="w-4 h-4 mr-2" />
                New Work Order for this Machine
            </Button>
        );
    }

    return (
        <Card className="border-blue-200 shadow-sm">
            <CardHeader className="pb-3 bg-blue-50/50 border-b">
                <CardTitle className="text-sm font-bold text-blue-800 flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    New Work Order
                </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
                <form onSubmit={handleSubmit} className="space-y-3">
                    <Input
                        placeholder="Title — e.g. Replace hydraulic filter"
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        disabled={loading || created}
                        className="h-10"
                        autoFocus
                    />
                    <Input
                        placeholder="Description (optional)"
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        disabled={loading || created}
                        className="h-10"
                    />
                    <div className="flex items-center gap-2">
                        {(['low', 'normal', 'high', 'urgent'] as const).map(p => (
                            <button
                                key={p}
                                type="button"
                                onClick={() => setPriority(p)}
                                className={`text-xs px-3 py-1.5 rounded-full border font-semibold uppercase transition-colors ${
                                    priority === p
                                        ? p === 'urgent' ? 'bg-red-600 text-white border-red-600'
                                        : p === 'high' ? 'bg-orange-500 text-white border-orange-500'
                                        : p === 'normal' ? 'bg-blue-600 text-white border-blue-600'
                                        : 'bg-slate-600 text-white border-slate-600'
                                        : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'
                                }`}
                            >
                                {p}
                            </button>
                        ))}
                    </div>
                    <div className="flex gap-2 pt-1">
                        <Button
                            type="submit"
                            disabled={loading || created || !title.trim()}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            {created ? (
                                <><CheckCircle2 className="w-4 h-4 mr-2" /> Created</>
                            ) : loading ? (
                                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating...</>
                            ) : (
                                'Create Work Order'
                            )}
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            disabled={loading}
                            onClick={() => { setOpen(false); setTitle(''); setDescription(''); }}
                        >
                            Cancel
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}
