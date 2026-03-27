'use client'

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import { Loader2, Search, Wrench, FileText } from 'lucide-react';
import Link from 'next/link';

export function SearchUI() {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const handleSearch = async () => {
        if (!query.trim()) return;

        setIsLoading(true);
        try {
            const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
            const result = await response.json();
            if (result.success) {
                setResults(result.data);
            } else {
                console.error('Search failed:', result.error);
            }
        } catch (error) {
            console.error('Search failed:', error);
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold">Catalogue de Pièces</h1>
            <p className="text-slate-500">
                Recherchez des pièces certifiées par leur nom, description ou numéro de pièce.
            </p>

            <div className="flex gap-2">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                        placeholder="Ex: Alternateur, Courroie, ABC-123..."
                        className="pl-10"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    />
                </div>
                <Button variant="industrial" onClick={handleSearch} disabled={isLoading}>
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Rechercher'}
                </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {results.length === 0 && !isLoading && query && (
                    <div className="col-span-full py-20 text-center">
                        <p className="text-slate-500">Aucune pièce trouvée pour &quot;{query}&quot;</p>
                    </div>
                )}

                {results.map((part) => (
                    <div key={part.id} className="glass-card flex flex-col justify-between p-5 rounded-xl border border-slate-100 dark:border-slate-800 transition-all hover:shadow-md">
                        <div>
                            <div className="flex justify-between items-start mb-2">
                                <span className="text-xs font-mono font-bold bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded text-slate-600 dark:text-slate-300">
                                    {part.part_number}
                                </span>
                                <span className="text-sm font-bold text-brand-primary">
                                    {part.base_cost_cad?.toFixed(2)} $
                                </span>
                            </div>
                            <h4 className="font-bold text-lg text-slate-800 dark:text-slate-100">{part.name}</h4>
                            <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 line-clamp-2">
                                {part.description}
                            </p>
                        </div>

                        <div className="mt-6 flex gap-2">
                            <Button variant="outline" size="sm" className="flex-1">
                                <FileText className="mr-2 h-3 w-3" /> PDF
                            </Button>
                            <Link href="/dashboard/quotes/create" className="flex-1">
                                <Button variant="default" size="sm" className="w-full">
                                    <Wrench className="mr-2 h-3 w-3" /> Commander
                                </Button>
                            </Link>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
