'use client'

import { useFormState, useFormStatus } from 'react-dom';
import { createMachine } from '@/domain/assets/actions/machines'
    ; // Ensure this path matches created file
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { useRouter } from 'next/navigation';


// Mock User ID provided by page wrapper
const initialState = { message: '', errors: {}, success: false };

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" disabled={pending} variant="industrial" className="w-full">
            {pending ? 'Creating Machine...' : 'Create Machine'}
        </Button>
    );
}

export default function MachineForm({ userId }: { userId: string }) {
    const [state, dispatch] = useFormState(createMachine, initialState);
    const router = useRouter();

    return (
        <form action={dispatch} className="space-y-6">
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <h3 className="mb-4 text-lg font-medium">Core Identification</h3>
                <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                        <Label htmlFor="serial_number">Serial Number *</Label>
                        <Input id="serial_number" name="serial_number" placeholder="ABC-12345" required />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="make">Make *</Label>
                        <Input id="make" name="make" placeholder="Caterpillar" required />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="model">Model *</Label>
                        <Input id="model" name="model" placeholder="320D" required />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="year">Year</Label>
                        <Input id="year" name="year" type="number" placeholder="2024" />
                    </div>
                </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <h3 className="mb-4 text-lg font-medium">Location (Strict)</h3>
                <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                        <Label htmlFor="country">Country *</Label>
                        <Input id="country" name="country" placeholder="Canada" required />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="state_province">State / Province *</Label>
                        <Input id="state_province" name="state_province" placeholder="Quebec" required />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="city">City *</Label>
                        <Input id="city" name="city" placeholder="Montreal" required />
                    </div>
                </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <h3 className="mb-4 text-lg font-medium">Technical Specs</h3>
                <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                        <Label htmlFor="engine_make">Engine Make</Label>
                        <Input id="engine_make" name="engine_make" placeholder="Perkins" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="engine_serial">Engine Serial</Label>
                        <Input id="engine_serial" name="engine_serial" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="current_hours">Current Hours</Label>
                        <Input id="current_hours" name="current_hours" type="number" defaultValue={0} />
                    </div>
                </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 border-l-4 border-l-brand-primary">
                <h3 className="mb-4 text-lg font-medium">Zero-Config Ingestion (Required)</h3>
                <p className="text-sm text-slate-500 mb-4">
                    Upload the specific technical manual for this machine serial number.
                    The AI will automatically extract parts, maintenance schedules, and diagnostic trees.
                </p>
                <div className="space-y-2">
                    <Label htmlFor="manual">Technical Manual(s) (PDF) *</Label>
                    <Input id="manual-multi-v7.2" name="manual" type="file" accept="application/pdf" multiple required />
                </div>
            </div>

            {state?.success ? (
                <div className="rounded-xl border border-green-200 bg-green-50 p-8 text-center dark:border-green-900/30 dark:bg-green-900/10">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                        <svg className="h-6 w-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h3 className="mb-2 text-xl font-bold text-green-900 dark:text-green-100">Machine Created Successfully</h3>
                    <p className="mb-6 text-green-700 dark:text-green-300">
                        {state.message || 'The machine has been registered and ingestion is in progress.'}
                    </p>
                    <Button
                        variant="industrial"
                        onClick={() => router.push('/dashboard/machines')}
                        className="w-full sm:w-auto"
                    >
                        Return to Dashboard
                    </Button>
                </div>
            ) : (
                <>
                    {state?.message && (
                        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-600 dark:border-red-900/30 dark:bg-red-900/10 dark:text-red-400">
                            {state.message}
                        </div>
                    )}
                    <SubmitButton />
                </>
            )}
        </form>
    );
}
