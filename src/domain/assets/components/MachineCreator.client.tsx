'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { createMachine } from '@/domain/assets/actions/machines';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info, Upload, CheckCircle2, AlertTriangle, FileText, Camera } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useRef } from 'react';
import { MachinePdfUploadPanel } from './MachinePdfUploadPanel';
import { MachineIngestionStatusPanel } from './MachineIngestionStatusPanel';

const initialState = { message: '', success: false };

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" disabled={pending} className="w-full bg-blue-600 text-white hover:bg-blue-700 h-12 text-lg font-semibold">
            {pending ? (
                <>
                    <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Creating Machine & Uploading Documents...
                </>
            ) : docCount > 0 ? (
                `Register Machine & Ingest ${docCount} Document(s)`
            ) : (
                'Create Machine Registration'
            )}
        </Button>
    );
}

export default function MachineCreator() {
    const [state, dispatch] = useFormState(createMachine, initialState);
    const router = useRouter();
    const [machineId, setMachineId] = useState<string | null>(null);
    const [runId, setRunId] = useState<string | null>(null);
    const [showStatus, setShowStatus] = useState(false);
    const [photoCount, setPhotoCount] = useState(0);
    const [docCount, setDocCount] = useState(0);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Intercept success state to handle second-step (upload)
    if (state?.success && !showStatus) {
        // If we don't have a machineId yet, we need to get it from the state (assuming modified createMachine returns it)
        // For now, I'll mock the machineId from a successful state or let handleCreate machine finish.
        return (
            <div className="max-w-4xl mx-auto py-12 space-y-8">
                <Card className="border-green-100 bg-green-50/50 shadow-lg">
                    <CardContent className="pt-8 text-center">
                        <CheckCircle2 size={32} className="mx-auto mb-4 text-green-600" />
                        <h2 className="text-2xl font-bold text-green-900 mb-2">✓ Machine Created & Documents Ingesting</h2>
                        <p className="text-green-700 mb-6 font-medium">Optional: Upload additional technical documents or monitor AI ingestion progress</p>
                        
                        <MachinePdfUploadPanel 
                          machineId={(state as any).machineId} 
                          onUploadComplete={async (docs) => {
                            // Start Ingestion
                            const res = await fetch(`/api/machines/${(state as any).machineId}/ingestion/start`, { method: 'POST' });
                            const data = await res.json();
                            setRunId(data.runId);
                            setShowStatus(true);
                          }} 
                        />
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (showStatus && runId) {
        return (
            <div className="max-w-4xl mx-auto py-12">
                <MachineIngestionStatusPanel runId={runId} />
                <div className="mt-8 flex justify-center">
                    <Button variant="outline" onClick={() => router.push('/dashboard/machines')}>
                        Return to Fleet Overview
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <form action={dispatch} className="max-w-4xl mx-auto space-y-8 pb-20">
            <div className="space-y-2">
                <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">EnviroJim Machine Creator</h1>
                <p className="text-slate-500">Register new equipment assets with AI-driven documentation analysis.</p>
            </div>

            {state?.message && !state.success && (
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{state.message}</AlertDescription>
                </Alert>
            )}

            <div className="grid gap-6 md:grid-cols-2">
                {/* Identification */}
                <Card className="shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Info size={18} className="text-slate-500" />
                            Core Identification
                        </CardTitle>
                        <CardDescription>Basic machine details. AI will fill missing fields.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="serial_number">Serial Number <span className="text-red-500">*</span></Label>
                            <Input id="serial_number" name="serial_number" placeholder="ex: EJ-SN-12345" required className="font-mono" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="make">Make</Label>
                                <Input id="make" name="make" placeholder="ex: Caterpillar" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="model">Model</Label>
                                <Input id="model" name="model" placeholder="ex: 320D" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Technical Vault Context - ACTIVE in step 1, documents are foundation of AI analysis */}
                <Card className="shadow-sm border-blue-200 bg-blue-50/50 md:col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileText size={18} className="text-blue-600" />
                            Technical Documents (AI Foundation)
                        </CardTitle>
                        <CardDescription>Upload PDF manuals, parts catalogs, service docs. Required to start AI analysis.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-6 p-4 border border-dashed border-blue-300 rounded-lg bg-white/50">
                            <Button type="button" variant="outline" className="relative h-20 w-40 border-dashed border-blue-400 text-blue-600 hover:bg-blue-100">
                                <Upload size={20} />
                                <Input
                                    ref={fileInputRef}
                                    id="manual"
                                    name="manual"
                                    type="file"
                                    accept=".pdf"
                                    multiple
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                    onChange={(e) => setDocCount(e.target.files?.length || 0)}
                                />
                            </Button>
                            <div className="flex-1">
                                {docCount > 0 ? (
                                    <p className="text-sm font-medium text-blue-700">✓ {docCount} document(s) selected for AI ingestion</p>
                                ) : (
                                    <p className="text-sm text-slate-500">Drag files here or click to browse</p>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Logistics & Engine (Optional, AI will try to populate) */}
            <Card className="shadow-sm">
                <CardHeader>
                    <CardTitle className="text-base uppercase tracking-wider text-slate-500 font-bold">Extended Metadata</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-6 md:grid-cols-3">
                    <div className="space-y-2">
                        <Label htmlFor="engine_make">Engine Make</Label>
                        <Input id="engine_make" name="engine_make" placeholder="ex: Perkins" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="engine_serial">Engine serial #</Label>
                        <Input id="engine_serial" name="engine_serial" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="current_hours">Initial Hours</Label>
                        <Input id="current_hours" name="current_hours" type="number" defaultValue={0} />
                    </div>
                </CardContent>
            </Card>

            {/* Photos & Visuals */}
            <Card className="shadow-sm border-blue-100 bg-blue-50/10">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Camera size={18} className="text-blue-500" />
                        Machine Photos
                    </CardTitle>
                    <CardDescription>Visual state at registration. Read-only for clients.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-4">
                        <Button type="button" variant="outline" className="relative h-20 w-32 border-dashed border-blue-200 text-blue-600 hover:bg-blue-50">
                            <Upload size={18} />
                            <Input 
                                id="photos" 
                                name="photos" 
                                type="file" 
                                accept="image/*" 
                                multiple 
                                className="absolute inset-0 opacity-0 cursor-pointer" 
                                onChange={(e) => setPhotoCount(e.target.files?.length || 0)}
                            />
                        </Button>
                        {photoCount > 0 && (
                            <div className="text-sm font-medium text-blue-700">
                                {photoCount} images selected for upload
                            </div>
                        )}
                        {photoCount === 0 && (
                            <p className="text-xs text-slate-400 italic">No photos selected. You can add them later.</p>
                        )}
                    </div>
                </CardContent>
            </Card>

            <div className="pt-4">
                <SubmitButton />
                <p className="text-center text-xs text-slate-400 mt-4">
                    By creating this machine, you initiate the EnviroJim AI Ingestion workflow. 
                    This process is resource-intensive and may take up to 2 minutes per document.
                </p>
            </div>
        </form>
    );
}
