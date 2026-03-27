'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, Loader2, Check, ChevronsUpDown, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { searchMachines } from '@/domain/assets/actions/machines';
import { Machine } from '@/types/schema';

interface MachineSelectorProps {
    onSelect: (machine: Machine) => void;
    selectedMachine?: Machine;
}

export function MachineSelector({ onSelect, selectedMachine }: MachineSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [machines, setMachines] = useState<Machine[]>([]);
    const [loading, setLoading] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        const fetchMachines = async () => {
            if (query.length < 2) {
                setMachines([]);
                return;
            }
            setLoading(true);
            try {
                const results = await searchMachines(query);
                setMachines(results);
            } catch (error) {
                console.error('Failed to search machines', error);
            } finally {
                setLoading(false);
            }
        };

        const timer = setTimeout(fetchMachines, 300);
        return () => clearTimeout(timer);
    }, [query]);

    return (
        <div className="relative w-full" ref={containerRef}>
            <div 
                className={cn(
                    "flex flex-col border rounded-xl bg-white transition-all shadow-sm cursor-pointer",
                    isOpen ? "ring-2 ring-blue-500 border-blue-500" : "hover:border-slate-300"
                )}
                onClick={() => setIsOpen(true)}
            >
                <div className="flex items-center justify-between p-3">
                    {selectedMachine ? (
                        <div className="flex flex-col items-start truncate overflow-hidden">
                            <span className="font-bold text-slate-800">{selectedMachine.make} {selectedMachine.model}</span>
                            <span className="text-xs text-slate-500">S/N: {selectedMachine.serial_number}</span>
                        </div>
                    ) : (
                        <span className="text-slate-400">Rechercher une machine par Marque, Modèle ou S/N...</span>
                    )}
                    <div className="flex items-center gap-2">
                        {selectedMachine && (
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6 rounded-full" 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onSelect(null as any);
                                    setQuery('');
                                }}
                            >
                                <X className="h-3 w-3" />
                            </Button>
                        )}
                        <ChevronsUpDown className="h-4 w-4 text-slate-400" />
                    </div>
                </div>
            </div>

            {isOpen && (
                <div className="absolute z-50 w-full mt-2 bg-white border rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                    <div className="p-2 border-b">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input 
                                autoFocus
                                className="pl-9 h-10 border-none focus-visible:ring-0" 
                                placeholder="Taper pour filtrer..."
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                            />
                        </div>
                    </div>
                    
                    <div className="max-h-[300px] overflow-y-auto p-1">
                        {loading && (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="h-5 w-5 animate-spin text-blue-500 mr-2" />
                                <span className="text-sm text-slate-500 italic">Analyse de la flotte...</span>
                            </div>
                        )}
                        
                        {!loading && machines.length === 0 && query.length >= 2 && (
                            <div className="py-8 text-center text-sm text-slate-500">
                                Aucune machine ne correspond à votre recherche.
                            </div>
                        )}
                        
                        {!loading && query.length < 2 && (
                            <div className="py-8 text-center text-sm text-slate-500 italic">
                                Commencez à taper pour rechercher...
                            </div>
                        )}

                        {!loading && machines.map((machine) => (
                            <div
                                key={machine.id}
                                className={cn(
                                    "flex flex-col items-start p-3 rounded-lg cursor-pointer transition-colors",
                                    selectedMachine?.id === machine.id ? "bg-blue-50" : "hover:bg-slate-50"
                                )}
                                onClick={() => {
                                    onSelect(machine);
                                    setIsOpen(false);
                                }}
                            >
                                <div className="flex items-center w-full justify-between">
                                    <span className="font-bold text-slate-800">{machine.make} {machine.model}</span>
                                    {selectedMachine?.id === machine.id && (
                                        <Check className="h-4 w-4 text-blue-600" />
                                    )}
                                </div>
                                <div className="flex gap-4 text-xs text-slate-500 mt-1">
                                    <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px] font-mono">S/N: {machine.serial_number}</span>
                                    {machine.city && <span className="flex items-center italic">📍 {machine.city}</span>}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
