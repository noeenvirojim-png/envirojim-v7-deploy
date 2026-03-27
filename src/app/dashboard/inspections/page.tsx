'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { VoiceInput } from '@/components/ui/voice-input';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Camera, CheckCircle, AlertTriangle, ArrowRight, Upload } from 'lucide-react';
import { submitInspection } from '@/domain/assets/actions/inspections';

// Types for the UI
type CheckItem = { id: string; label: string; passed: boolean | null };

const DEFAULT_CHECKS: CheckItem[] = [
    { id: 'fluids', label: 'Niveaux des fluides (Huile, Refroidissement)', passed: null },
    { id: 'leaks', label: 'Absence de fuites visibles', passed: null },
    { id: 'tires', label: 'État des pneus / chenilles', passed: null },
    { id: 'safety', label: 'Équipements de sécurité (Klaxon, Gyrophare)', passed: null },
];

export default function DailyInspectionsPage() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [machineId, setMachineId] = useState('');
    const [hours, setHours] = useState('');
    const [checks, setChecks] = useState<CheckItem[]>(DEFAULT_CHECKS);
    const [voiceComment, setVoiceComment] = useState('');
    const [photo, setPhoto] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const isAllChecksPassed = checks.every(c => c.passed === true);
    const hasAnyFailure = checks.some(c => c.passed === false);

    const handleCheck = (id: string, passed: boolean) => {
        setChecks(checks.map(c => c.id === id ? { ...c, passed } : c));
    };

    const handleVoiceTranscription = (text: string) => {
        setVoiceComment(text);
        // Automatically progress to completion if everything is filled
    };

    const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setPhoto(e.target.files[0]);
        }
    };

    const onSubmit = async () => {
        setIsSubmitting(true);
        // Photo upload would go here via storage.ts uploadFile in a real flow
        const result = await submitInspection({
            machineId,
            currentHours: parseInt(hours),
            isCompliant: !hasAnyFailure,
            comments: voiceComment || 'Aucun commentaire'
        });

        setIsSubmitting(false);

        if (result.success) {
            if (hasAnyFailure) {
                // Auto-prompt to create ticket since inspection failed
                router.push(`/dashboard/tickets/new?machineId=${machineId}&reason=inspection_failed&notes=${encodeURIComponent(voiceComment)}`);
            } else {
                router.push('/dashboard/machines?success=inspection_completed');
            }
        } else {
            alert(result.error);
        }
    };

    return (
        <div className="max-w-xl mx-auto p-4 space-y-6">
            <h1 className="text-2xl font-bold border-b pb-4">Inspection Journalière</h1>

            {step === 1 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                    <div className="space-y-4">
                        <label className="block text-sm font-medium">Identifier la machine</label>
                        <div className="flex gap-2">
                            <Input
                                placeholder="N° de Série ou ID"
                                value={machineId}
                                onChange={(e) => setMachineId(e.target.value)}
                                className="h-12 text-lg"
                            />
                            <Button size="icon" className="h-12 w-12 shrink-0 bg-slate-900" onClick={() => router.push('/dashboard/scan')}>
                                <Camera className="h-6 w-6" />
                            </Button>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <label className="block text-sm font-medium">Heures d'utilisation (Obligatoire)</label>
                        <Input
                            type="number"
                            placeholder="Ex: 4500"
                            value={hours}
                            onChange={(e) => setHours(e.target.value)}
                            className="h-12 text-lg"
                        />
                    </div>

                    <Button
                        className="w-full h-14 text-lg mt-8"
                        disabled={!machineId || !hours}
                        onClick={() => setStep(2)}
                    >
                        Suivant <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                </div>
            )}

            {step === 2 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                    <h2 className="text-lg font-semibold">Points de contrôle</h2>
                    <div className="grid gap-4">
                        {checks.map(check => (
                            <div key={check.id} className="p-4 border rounded-xl bg-white shadow-sm flex items-center justify-between">
                                <span className="font-medium text-slate-700">{check.label}</span>
                                <div className="flex gap-2 shrink-0 ml-4">
                                    <Button
                                        size="icon"
                                        variant={check.passed === true ? 'default' : 'outline'}
                                        className={check.passed === true ? 'bg-green-600 hover:bg-green-700' : ''}
                                        onClick={() => handleCheck(check.id, true)}
                                    >
                                        <CheckCircle className="h-5 w-5" />
                                    </Button>
                                    <Button
                                        size="icon"
                                        variant={check.passed === false ? 'destructive' : 'outline'}
                                        onClick={() => handleCheck(check.id, false)}
                                    >
                                        <AlertTriangle className="h-5 w-5" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="pt-4 flex gap-4">
                        <Button variant="outline" className="flex-1 h-12" onClick={() => setStep(1)}>Retour</Button>
                        <Button
                            className="flex-1 h-12"
                            disabled={checks.some(c => c.passed === null)}
                            onClick={() => setStep(3)}
                        >
                            Suivant <ArrowRight className="ml-2 h-5 w-5" />
                        </Button>
                    </div>
                </div>
            )}

            {step === 3 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                    <h2 className="text-lg font-semibold">Preuves et commentaires</h2>

                    {/* Photo Upload */}
                    <div className="p-6 border-2 border-dashed border-slate-300 rounded-2xl flex flex-col items-center justify-center bg-slate-50 relative">
                        {photo ? (
                            <p className="text-green-600 font-medium flex items-center"><CheckCircle className="mr-2 h-5 w-5" /> Photo attachée</p>
                        ) : (
                            <>
                                <Upload className="h-8 w-8 text-slate-400 mb-2" />
                                <span className="text-slate-600">Ajouter une photo (Optionnel)</span>
                                <input
                                    type="file"
                                    accept="image/*"
                                    capture="environment"
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                    onChange={handlePhotoUpload}
                                />
                            </>
                        )}
                    </div>

                    {/* Voice First Comment */}
                    <div>
                        <label className="block text-sm font-medium mb-2">Constat (Vocal prioritaire)</label>
                        <VoiceInput
                            onTextSubmitted={handleVoiceTranscription}
                            placeholder="Appuyez sur le micro pour dicter vos observations..."
                        />
                        {voiceComment && (
                            <div className="mt-4 p-4 bg-blue-50 text-blue-800 rounded-lg text-sm border border-blue-100">
                                <strong>Transcription :</strong> "{voiceComment}"
                            </div>
                        )}
                    </div>

                    {hasAnyFailure && (
                        <div className="p-4 bg-red-50 text-red-800 rounded-xl border border-red-200 flex items-start">
                            <AlertTriangle className="h-5 w-5 mr-3 shrink-0 mt-0.5" />
                            <p className="text-sm">Une ou plusieurs anomalies ont été détectées. <strong>La validation créera automatiquement un ticket d'intervention.</strong></p>
                        </div>
                    )}

                    <div className="pt-6 flex gap-4">
                        <Button variant="outline" className="flex-1 h-14" disabled={isSubmitting} onClick={() => setStep(2)}>Retour</Button>
                        <Button
                            className={`flex-1 h-14 text-lg ${hasAnyFailure ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600'}`}
                            disabled={isSubmitting}
                            onClick={onSubmit}
                        >
                            {isSubmitting ? 'Traitement...' : (hasAnyFailure ? 'Créer le Ticket' : 'Valider l\'Inspection')}
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
