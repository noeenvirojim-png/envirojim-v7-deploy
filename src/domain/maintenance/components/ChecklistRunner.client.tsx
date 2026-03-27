'use client';

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '../../../components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Camera, Mic, Loader2, Save } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ChecklistInstanceItem } from '@/types/schema';

export function ChecklistRunner({ items, onSave }: { items: ChecklistInstanceItem[], onSave: (items: any[]) => void }) {
    const [currentItems, setCurrentItems] = useState(items);
    const [isSaving, setIsSaving] = useState(false);

    const toggleCheck = (id: string) => {
        setCurrentItems(prev => prev.map(item => 
            item.id === id ? { ...item, is_checked: !item.is_checked } : item
        ));
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between sticky top-0 bg-white/80 backdrop-blur-md z-10 py-2 border-b">
                <Badge variant="outline">Progression: {currentItems.filter(i => i.is_checked).length} / {currentItems.length}</Badge>
                <Button 
                    size="sm" 
                    onClick={() => onSave(currentItems)} 
                    disabled={isSaving}
                    className="bg-emerald-600 hover:bg-emerald-700 h-8"
                >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                    Enregistrer
                </Button>
            </div>

            <div className="space-y-4">
                {currentItems.map((item, idx) => (
                    <Card key={item.id} className={`transition-all ${item.is_checked ? 'bg-slate-50 opacity-80' : 'bg-white border-slate-300 shadow-md'}`}>
                        <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                                <Checkbox 
                                    id={item.id} 
                                    checked={item.is_checked} 
                                    onCheckedChange={() => toggleCheck(item.id)}
                                    className="mt-1"
                                />
                                <div className="flex-1 space-y-3">
                                    <Label htmlFor={item.id} className="text-sm font-bold block leading-tight">
                                        {idx + 1}. {item.text}
                                    </Label>
                                    
                                    {!item.is_checked && (
                                        <div className="flex gap-2">
                                            <Button size="sm" variant="outline" className="h-8 rounded-full text-[10px] px-3 border-dashed">
                                                <Camera className="w-3 h-3 mr-1" /> Photo Info
                                            </Button>
                                            <Button size="sm" variant="outline" className="h-8 rounded-full text-[10px] px-3 border-dashed">
                                                <Mic className="w-3 h-3 mr-1" /> Note Vocale
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
