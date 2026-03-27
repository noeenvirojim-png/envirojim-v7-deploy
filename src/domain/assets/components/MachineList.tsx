'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Plus, ArrowUpDown, ChevronUp, ChevronDown, Filter } from "lucide-react";
import Link from "next/link";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

interface MachineListProps {
    machines: any[];
    totalPages: number;
    userRole?: string;
}

export function MachineList({ machines, totalPages, userRole }: MachineListProps) {
    const router = useRouter();
    const searchParams = useSearchParams();

    // Local state for instant input feedback, sync to URL on enter or blur
    const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
    const [cityFilter, setCityFilter] = useState(searchParams.get('city') || '');
    const [makeFilter, setMakeFilter] = useState(searchParams.get('make') || '');
    const [yearFilter, setYearFilter] = useState(searchParams.get('year') || '');

    const currentSort = searchParams.get('sort') || 'Last Updated';
    const currentDir = searchParams.get('dir') || 'desc';
    const currentPage = parseInt(searchParams.get('page') || '1');

    const updateQuery = (updates: Record<string, string | null>) => {
        const params = new URLSearchParams(searchParams.toString());
        for (const [key, value] of Object.entries(updates)) {
            if (value === null || value === '') {
                params.delete(key);
            } else {
                params.set(key, value);
            }
        }
        router.push(`?${params.toString()}`);
    };

    const toggleSort = (column: string) => {
        if (currentSort === column) {
            updateQuery({ dir: currentDir === 'asc' ? 'desc' : 'asc' });
        } else {
            updateQuery({ sort: column, dir: 'asc' });
        }
    };

    const handleSearch = () => {
        updateQuery({
            search: searchTerm,
            city: cityFilter,
            make: makeFilter,
            year: yearFilter,
            page: '1' // reset page on filter
        });
    };

    const SortIcon = ({ column }: { column: string }) => {
        if (currentSort !== column) return <ArrowUpDown className="ml-2 h-4 w-4" />;
        return currentDir === 'asc' ? <ChevronUp className="ml-2 h-4 w-4" /> : <ChevronDown className="ml-2 h-4 w-4" />;
    };

    const cols = [
        "Client", "City", "Make", "Model", "Serial Number", "Year", "Current Hours", "Engine", "Last Updated"
    ];

    return (
        <div className="space-y-4">
            {/* Filters Bar */}
            <div className="flex flex-wrap gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="relative flex-grow min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Search SN, Model, Client..."
                        className="pl-9 h-10"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    />
                </div>
                <Input
                    placeholder="City"
                    className="w-32 h-10"
                    value={cityFilter}
                    onChange={(e) => setCityFilter(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
                <Input
                    placeholder="Make"
                    className="w-32 h-10"
                    value={makeFilter}
                    onChange={(e) => setMakeFilter(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
                <Input
                    placeholder="Year"
                    className="w-24 h-10"
                    value={yearFilter}
                    onChange={(e) => setYearFilter(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
                <Button variant="outline" className="h-10" onClick={handleSearch}>
                    <Filter className="w-4 h-4 mr-2" />
                    Apply Filters
                </Button>
            </div>

            {/* ERP Table */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader className="bg-slate-50 dark:bg-slate-900/50">
                            <TableRow>
                                {cols.map((col) => (
                                    <TableHead key={col}>
                                        <Button
                                            variant="ghost"
                                            onClick={() => toggleSort(col)}
                                            className="font-semibold px-0 hover:bg-transparent"
                                        >
                                            {col}
                                            <SortIcon column={col} />
                                        </Button>
                                    </TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {machines.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={9} className="h-24 text-center text-slate-500">
                                        No machines found matching your criteria.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                machines.map((machine) => (
                                    <TableRow
                                        key={machine.id}
                                        className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                                        onClick={() => router.push(`/dashboard/machines/${machine.id}`)}
                                    >
                                        <TableCell className="font-medium text-primary">
                                            {machine.organization?.name || 'Unknown Client'}
                                        </TableCell>
                                        <TableCell>{machine.city || '-'}</TableCell>
                                        <TableCell>{machine.make || '-'}</TableCell>
                                        <TableCell>{machine.model || '-'}</TableCell>
                                        <TableCell className="font-mono text-sm">{machine.serialNumber}</TableCell>
                                        <TableCell>{machine.year || '-'}</TableCell>
                                        <TableCell suppressHydrationWarning>{machine.currentHours?.toLocaleString() || '0'} hrs</TableCell>
                                        <TableCell>{machine.engineMake || '-'}</TableCell>
                                        <TableCell className="text-slate-500 text-sm" suppressHydrationWarning>
                                            {new Date(machine.updatedAt || machine.createdAt).toLocaleDateString()}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="p-4 flex items-center justify-between border-t border-slate-200 dark:border-slate-800">
                        <span className="text-sm text-slate-500">
                            Page {currentPage} of {totalPages}
                        </span>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={currentPage <= 1}
                                onClick={() => updateQuery({ page: (currentPage - 1).toString() })}
                            >
                                Previous
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={currentPage >= totalPages}
                                onClick={() => updateQuery({ page: (currentPage + 1).toString() })}
                            >
                                Next
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
