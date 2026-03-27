'use client'

import { useState } from 'react'
import { useFormState } from 'react-dom'
import { createPartRequestAction } from '@/domain/procurement/actions/parts'
import { Form } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { PartsTable } from './PartsTable'
import { PartCatalogItem } from '@/types/schema'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { X, ShoppingCart, Wrench } from 'lucide-react'

// Define Machine type since we don't have a shared one handy here
interface Machine {
    id: string;
    model: string;
    serialNumber: string;
}

interface PartRequestFormProps {
    catalogParts: PartCatalogItem[]
    machines: Machine[]
    userId: string
    organizationId: string
}

const initialState = {
    success: false,
    error: undefined,
    message: ''
}

export function PartRequestForm({ catalogParts, machines, userId, organizationId }: PartRequestFormProps) {
    const [selectedParts, setSelectedParts] = useState<{ part: PartCatalogItem, quantity: number }[]>([])

    // Use useFormState to handle the server action response
    // @ts-ignore - Validated action signature matches but TS inference can be strict with discriminated unions
    const [state, formAction] = useFormState(createPartRequestAction, initialState)

    const addToCart = (part: PartCatalogItem) => {
        setSelectedParts(prev => {
            const existing = prev.find(p => p.part.id === part.id)
            if (existing) {
                return prev.map(p => p.part.id === part.id ? { ...p, quantity: p.quantity + 1 } : p)
            }
            return [...prev, { part, quantity: 1 }]
        })
    }

    const removeFromCart = (partId: string) => {
        setSelectedParts(prev => prev.filter(p => p.part.id !== partId))
    }

    const updateQuantity = (partId: string, quantity: number) => {
        if (quantity < 1) return
        setSelectedParts(prev => prev.map(p => p.part.id === partId ? { ...p, quantity } : p))
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in-up">
            {/* Catalog Section */}
            <div className="lg:col-span-2 space-y-4">
                <Card className="border-slate-100 shadow-sm">
                    <CardHeader>
                        <CardTitle>Parts Catalog</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <PartsTable parts={catalogParts} onAddToCart={addToCart} />
                    </CardContent>
                </Card>
            </div>

            {/* Cart / Request Section */}
            <div className="lg:col-span-1 space-y-4">
                <Card className="sticky top-4 border-slate-100 shadow-md">
                    <CardHeader className="bg-slate-50 border-b border-slate-100 pb-4">
                        <CardTitle className="flex items-center gap-2 text-primary">
                            <ShoppingCart className="w-5 h-5 text-accent" />
                            New Request
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4">
                        {selectedParts.length === 0 ? (
                            <div className="text-center py-8 text-slate-400 text-sm">
                                <span className="block mb-2">Cart is empty</span>
                                Add items from the catalog to start a request.
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                                    {selectedParts.map(({ part, quantity }) => (
                                        <div key={part.id} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-lg text-sm shadow-sm">
                                            <div className="flex-1 min-w-0 mr-2">
                                                <div className="font-medium truncate text-slate-700">{part.name}</div>
                                                <div className="text-xs text-slate-400 font-mono">{part.part_number}</div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Input
                                                    type="number"
                                                    min="1"
                                                    value={quantity}
                                                    onChange={(e) => updateQuantity(part.id, parseInt(e.target.value))}
                                                    className="w-16 h-8 text-center px-1 bg-slate-50"
                                                />
                                                <Button size="sm" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-destructive hover:bg-destructive/10" onClick={() => removeFromCart(part.id)}>
                                                    <X className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="border-t border-slate-100 pt-4">
                                    {/* We use a standard form here but bind the action */}
                                    <form action={formAction} className="space-y-4">
                                        <div>
                                            <label className="text-xs font-medium mb-1.5 block text-slate-600 flex items-center gap-1">
                                                <Wrench className="w-3 h-3" /> Select Machine
                                            </label>
                                            <select name="machine_id" className="w-full text-sm border-slate-200 rounded-md p-2.5 bg-slate-50 focus:ring-accent focus:border-accent" required>
                                                <option value="">-- Choisir Machine --</option>
                                                {machines.map(m => (
                                                    <option key={m.id} value={m.id}>{m.model} ({m.serialNumber})</option>
                                                ))}
                                            </select>
                                        </div>
                                        <input type="hidden" name="items" value={JSON.stringify(selectedParts.map(p => ({ partId: p.part.id, quantity: p.quantity })))} />
                                        <input type="hidden" name="urgency" value="NORMAL" />

                                        {state?.error && (
                                            <div className="text-xs text-destructive bg-destructive/10 p-2.5 rounded border border-destructive/20 font-medium">
                                                {state.error}
                                            </div>
                                        )}
                                        {state?.success && (
                                            <div className="text-xs text-emerald-600 bg-emerald-50 p-2.5 rounded border border-emerald-100 font-medium">
                                                {state.message}
                                            </div>
                                        )}

                                        <Button type="submit" className="w-full font-semibold shadow-accent/20 shadow-lg" variant="default">
                                            Submit Request
                                        </Button>
                                    </form>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
