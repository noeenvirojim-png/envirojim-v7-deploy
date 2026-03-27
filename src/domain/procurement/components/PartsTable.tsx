'use client'

import { useState } from 'react'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, Filter, ShoppingCart } from "lucide-react"
import { PartCatalogItem } from "@/types/schema"

interface PartsTableProps {
    parts: PartCatalogItem[]
    onAddToCart?: (part: PartCatalogItem) => void
}

export function PartsTable({ parts, onAddToCart }: PartsTableProps) {
    const [search, setSearch] = useState('')

    const filteredParts = parts.filter(part =>
        part.name.toLowerCase().includes(search.toLowerCase()) ||
        part.part_number.toLowerCase().includes(search.toLowerCase()) ||
        (part.description || "").toLowerCase().includes(search.toLowerCase())
    )

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search catalog..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9 bg-white dark:bg-slate-900"
                    />
                </div>
                <Button variant="outline" size="sm" className="gap-2">
                    <Filter className="w-4 h-4" />
                    Filter
                </Button>
            </div>

            <div className="rounded-md border bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-slate-50 dark:bg-slate-950">
                            <TableHead>Part Number</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead className="hidden md:table-cell">Description</TableHead>
                            <TableHead className="hidden sm:table-cell">Category</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredParts.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                    No parts found matching your search.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredParts.map((part) => (
                                <TableRow key={part.id}>
                                    <TableCell className="font-mono text-xs">{part.part_number}</TableCell>
                                    <TableCell className="font-medium text-slate-900 dark:text-slate-100">{part.name}</TableCell>
                                    <TableCell className="hidden md:table-cell text-muted-foreground max-w-xs truncate text-xs">
                                        {part.description}
                                    </TableCell>
                                    <TableCell className="hidden sm:table-cell">
                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                                            {part.category}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {onAddToCart && (
                                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => onAddToCart(part)}>
                                                <ShoppingCart className="h-4 w-4 text-primary" />
                                                <span className="sr-only">Add to Request</span>
                                            </Button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
