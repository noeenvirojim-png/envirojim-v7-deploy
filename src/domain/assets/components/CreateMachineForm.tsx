'use client'

import { useState } from 'react'
import { useFormState } from 'react-dom'
import { createMachine, type ActionState } from '@/domain/assets/actions/machines';
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Upload, CheckCircle2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

const initialState = {
    message: '',
    errors: undefined,
    success: false
}

export function CreateMachineForm({ userId }: { userId: string }) {
    const router = useRouter()
    // Correctly bind useFormState to the createMachine action
    const [state, formAction] = useFormState(createMachine, initialState)

    // Note: We'd need to track success state from the action result to show the next step.
    // Ideally createMachine returns the new machine ID in 'message' or a data field.
    // For now, if state.success is true, we assume created.

    // Since useFormState doesn't easily convert "success" to a mode switch without useEffect,
    // we'll rely on the user seeing a success message or we can add a simple effect.
    // But to keep it robust and simple:

    if (state.success) {
        return (
            <Card className="max-w-xl mx-auto border-success/20 bg-success/5">
                <CardHeader className="text-center">
                    <div className="mx-auto w-12 h-12 bg-success/10 rounded-full flex items-center justify-center mb-4">
                        <CheckCircle2 className="w-6 h-6 text-success" />
                    </div>
                    <CardTitle className="text-success">Machine Created Successfully</CardTitle>
                    <CardDescription>
                        {state.message}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Button variant="outline" className="w-full" onClick={() => router.push('/dashboard/machines')}>
                        Return to Dashboard
                    </Button>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="max-w-2xl mx-auto shadow-lg">
            <CardHeader>
                <CardTitle>Register New Machine</CardTitle>
                <CardDescription>Enter the technical details of the equipment to track.</CardDescription>
            </CardHeader>
            <CardContent>
                <form action={formAction} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label htmlFor="serial_number" className="text-sm font-medium">Serial Number</label>
                            <Input id="serial_number" name="serial_number" placeholder="SN-12345678" required />
                            {state.errors?.serial_number && <p className="text-xs text-destructive">{state.errors.serial_number[0]}</p>}
                        </div>
                        <div className="space-y-2">
                            <label htmlFor="make" className="text-sm font-medium">Make</label>
                            <Input id="make" name="make" placeholder="e.g. Caterpillar" required />
                        </div>
                        <div className="space-y-2">
                            <label htmlFor="model" className="text-sm font-medium">Model</label>
                            <Input id="model" name="model" placeholder="X-Series 2024" required />
                        </div>
                        <div className="space-y-2">
                            <label htmlFor="year" className="text-sm font-medium">Year</label>
                            <Input id="year" name="year" type="number" placeholder="2024" />
                        </div>
                        <div className="space-y-2">
                            <label htmlFor="current_hours" className="text-sm font-medium">Current Hours</label>
                            <Input id="current_hours" name="current_hours" type="number" placeholder="0" />
                        </div>

                        <div className="col-span-1 md:col-span-2 border-t pt-4">
                            <label className="text-sm font-medium block mb-2">Technical Manual (PDF)</label>
                            <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg p-6 text-center hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                                <Upload className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                                <input id="manual" name="manual" type="file" className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20" accept=".pdf" />
                                <p className="text-xs text-slate-400 mt-2">Required for Zero-Config Ingestion</p>
                            </div>
                        </div>
                    </div>

                    {state.message && !state.success && (
                        <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
                            {state.message}
                        </div>
                    )}

                    <Button type="submit" className="w-full" variant="industrial">
                        Start Ingestion Process
                    </Button>
                </form>
            </CardContent>
        </Card>
    )
}
