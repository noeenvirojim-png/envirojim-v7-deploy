'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Loader2, CheckCircle, Keyboard } from 'lucide-react';
import { Button } from './button';
import { cn } from '@/lib/utils';

export type VoiceInputState = 'IDLE' | 'RECORDING' | 'PROCESSING' | 'COMPLETED' | 'ERROR';

interface VoiceInputProps {
    onAudioCaptured?: (blob: Blob) => void;
    onTextSubmitted?: (text: string) => void;
    isProcessing?: boolean; // Parent can override to force processing state
    placeholder?: string;
    className?: string;
}

export function VoiceInput({
    onAudioCaptured,
    onTextSubmitted,
    isProcessing: externalProcessing = false,
    placeholder = "Décrivez le problème...",
    className
}: VoiceInputProps) {
    const [state, setState] = useState<VoiceInputState>('IDLE');
    const [useTextFallback, setUseTextFallback] = useState(false);
    const [textValue, setTextValue] = useState('');
    const [recordingTime, setRecordingTime] = useState(0);

    const mediaRecorder = useRef<MediaRecorder | null>(null);
    const audioChunks = useRef<Blob[]>([]);
    const timerInterval = useRef<NodeJS.Timeout | null>(null);

    // Sync external processing state
    useEffect(() => {
        if (externalProcessing) setState('PROCESSING');
        else if (state === 'PROCESSING') setState('COMPLETED');
    }, [externalProcessing]);

    // Timer logic
    useEffect(() => {
        if (state === 'RECORDING') {
            setRecordingTime(0);
            timerInterval.current = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);
        } else {
            if (timerInterval.current) clearInterval(timerInterval.current);
        }
        return () => {
            if (timerInterval.current) clearInterval(timerInterval.current);
        };
    }, [state]);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder.current = new MediaRecorder(stream);
            audioChunks.current = [];

            mediaRecorder.current.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunks.current.push(event.data);
                }
            };

            mediaRecorder.current.onstop = () => {
                const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' });
                if (onAudioCaptured) {
                    onAudioCaptured(audioBlob);
                }
                setState('PROCESSING'); // Waiting for parent to finish API call

                // Stop all tracks
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.current.start();
            setState('RECORDING');
        } catch (err) {
            console.error("Microphone access denied or failed", err);
            setState('ERROR');
            setUseTextFallback(true);
        }
    };

    const stopRecording = () => {
        if (mediaRecorder.current && state === 'RECORDING') {
            mediaRecorder.current.stop();
        }
    };

    const handleTextSubmit = () => {
        if (textValue.trim() && onTextSubmitted) {
            setState('PROCESSING');
            onTextSubmitted(textValue);
        }
    };

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    return (
        <div className={cn("w-full flex flex-col space-y-4", className)}>
            {/* Primary Voice UI */}
            {!useTextFallback && (
                <div className="flex flex-col items-center justify-center p-8 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl transition-all duration-300">

                    {state === 'IDLE' && (
                        <div className="flex flex-col items-center gap-4">
                            <Button
                                size="lg"
                                className="h-24 w-24 rounded-full bg-blue-600 hover:bg-blue-700 shadow-xl hover:scale-105 transition-transform"
                                onClick={startRecording}
                            >
                                <Mic className="h-10 w-10 text-white" />
                            </Button>
                            <p className="text-slate-500 font-medium">Appuyez pour parler</p>
                        </div>
                    )}

                    {state === 'RECORDING' && (
                        <div className="flex flex-col items-center gap-4">
                            <div className="relative flex items-center justify-center h-24 w-24">
                                <div className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-75"></div>
                                <Button
                                    size="lg"
                                    variant="destructive"
                                    className="relative h-24 w-24 rounded-full shadow-xl"
                                    onClick={stopRecording}
                                >
                                    <Square className="h-8 w-8 text-white fill-current" />
                                </Button>
                            </div>
                            <div className="flex flex-col items-center">
                                <span className="text-red-500 font-bold animate-pulse">Enregistrement...</span>
                                <span className="text-slate-600 font-mono text-lg">{formatTime(recordingTime)}</span>
                            </div>
                            {/* Fake Waveform */}
                            <div className="flex space-x-1 mt-2 h-8 items-end">
                                {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                                    <div key={i} className="w-1.5 bg-red-400 rounded-full animate-pulse"
                                        style={{ height: `${Math.max(20, Math.random() * 100)}%`, animationDelay: `${i * 0.1}s` }} />
                                ))}
                            </div>
                        </div>
                    )}

                    {state === 'PROCESSING' && (
                        <div className="flex flex-col items-center gap-4">
                            <div className="h-24 w-24 rounded-full bg-slate-100 flex items-center justify-center">
                                <Loader2 className="h-10 w-10 text-blue-600 animate-spin" />
                            </div>
                            <p className="text-slate-600 font-medium animate-pulse">Analyse en cours...</p>
                        </div>
                    )}

                    {state === 'COMPLETED' && (
                        <div className="flex flex-col items-center gap-4">
                            <div className="h-24 w-24 rounded-full bg-green-100 flex items-center justify-center">
                                <CheckCircle className="h-12 w-12 text-green-600" />
                            </div>
                            <p className="text-green-700 font-bold">Transcription terminée</p>
                            <Button variant="outline" size="sm" onClick={() => setState('IDLE')} className="mt-2">
                                Recommencer
                            </Button>
                        </div>
                    )}

                    {state === 'IDLE' && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="mt-6 text-slate-400 hover:text-slate-600"
                            onClick={() => setUseTextFallback(true)}
                        >
                            <Keyboard className="h-4 w-4 mr-2" />
                            Passer en mode clavier
                        </Button>
                    )}
                </div>
            )}

            {/* Fallback Text UI */}
            {useTextFallback && (
                <div className="flex flex-col space-y-3 bg-white p-4 rounded-xl border border-slate-200">
                    <textarea
                        className="flex min-h-[120px] w-full rounded-md border border-slate-200 bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
                        placeholder={placeholder}
                        value={textValue}
                        onChange={(e) => setTextValue(e.target.value)}
                        disabled={state === 'PROCESSING'}
                    />
                    <div className="flex justify-between items-center">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setUseTextFallback(false)}
                            disabled={state === 'PROCESSING'}
                        >
                            <Mic className="h-4 w-4 mr-2" />
                            Retour Voix
                        </Button>
                        <Button
                            onClick={handleTextSubmit}
                            disabled={!textValue.trim() || state === 'PROCESSING'}
                        >
                            {state === 'PROCESSING' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                            Soumettre
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
