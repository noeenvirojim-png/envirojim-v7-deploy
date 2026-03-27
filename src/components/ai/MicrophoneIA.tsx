'use client';

import { useState, useRef, useEffect } from 'react';
import { Mic, Square, Loader2, AlertCircle, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface MicrophoneIAProps {
    onTranscriptionComplete?: (text: string) => void;
}

export function MicrophoneIA({ onTranscriptionComplete }: MicrophoneIAProps) {
    const [status, setStatus] = useState<'idle' | 'recording' | 'processing' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState('');
    const mediaRecorder = useRef<MediaRecorder | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const chunks = useRef<Blob[]>([]);
    const silenceTimeout = useRef<NodeJS.Timeout | null>(null);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (silenceTimeout.current) clearTimeout(silenceTimeout.current);
            if (mediaRecorder.current && mediaRecorder.current.state === 'recording') {
                mediaRecorder.current.stop();
            }
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => {
                    track.stop();
                    // Fully detach
                    track.enabled = false;
                });
            }
        };
    }, []);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;
            mediaRecorder.current = new MediaRecorder(stream);
            chunks.current = [];

            mediaRecorder.current.ondataavailable = (e) => {
                if (e.data.size > 0) chunks.current.push(e.data);
            };

            mediaRecorder.current.onstop = async () => {
                const audioBlob = new Blob(chunks.current, { type: 'audio/webm' });
                await processAudio(audioBlob);
                if (streamRef.current) {
                    streamRef.current.getTracks().forEach(track => track.stop());
                }
            };

            mediaRecorder.current.start();
            setStatus('recording');
            setErrorMessage('');

            // Safety timeout: Auto-stop after 30 seconds
            silenceTimeout.current = setTimeout(() => {
                if (mediaRecorder.current?.state === 'recording') stopRecording();
            }, 30000);

        } catch (err: any) {
            console.error('[MICROPHONE IA] Permission denied or error:', err);
            setStatus('error');
            setErrorMessage(err.name === 'NotAllowedError' ? 'Microphone access denied' : 'System error');
        }
    };

    const stopRecording = () => {
        if (mediaRecorder.current && mediaRecorder.current.state === 'recording') {
            mediaRecorder.current.stop();
            setStatus('processing');
            if (silenceTimeout.current) clearTimeout(silenceTimeout.current);
        }
    };

    const processAudio = async (blob: Blob) => {
        try {
            const formData = new FormData();
            formData.append('audio', blob, 'recording.webm');

            const response = await fetch('/api/ai/transcribe', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Transcription failed');
            }

            const data = await response.json();
            setStatus('success');
            onTranscriptionComplete?.(data.text);

            setTimeout(() => setStatus('idle'), 3000);
        } catch (err: any) {
            setStatus('error');
            setErrorMessage(err.message || 'AI processing failed');
        }
    };

    return (
        <div className="flex flex-col items-center gap-4 p-6 bg-slate-50 border border-slate-200 rounded-2xl shadow-inner">
            <div className="relative">
                {status === 'recording' && (
                    <div className="absolute inset-0 bg-red-500/20 rounded-full animate-ping scale-150" />
                )}
                <Button
                    size="lg"
                    className={`w-20 h-20 rounded-full shadow-lg transition-all ${status === 'recording' ? 'bg-red-600 hover:bg-red-700' : 'bg-brand-primary'
                        }`}
                    onClick={status === 'recording' ? stopRecording : startRecording}
                    disabled={status === 'processing'}
                >
                    {status === 'recording' ? (
                        <Square className="w-8 h-8 fill-current" />
                    ) : status === 'processing' ? (
                        <Loader2 className="w-8 h-8 animate-spin" />
                    ) : (
                        <Mic className="w-8 h-8" />
                    )}
                </Button>
            </div>

            <div className="text-center space-y-2">
                <div className="flex items-center justify-center gap-2 h-6">
                    {status === 'recording' && (
                        <Badge variant="destructive" className="animate-pulse px-2 py-0 h-5">Recording...</Badge>
                    )}
                    {status === 'processing' && (
                        <span className="text-sm font-medium text-slate-500 flex items-center gap-1">
                            <Loader2 className="w-3 h-3 animate-spin" /> Analyzing voice
                        </span>
                    )}
                    {status === 'success' && (
                        <span className="text-sm font-medium text-green-600 flex items-center gap-1">
                            <Check className="w-4 h-4" /> AI Ready
                        </span>
                    )}
                    {status === 'idle' && (
                        <span className="text-sm font-medium text-slate-400">Tap to start voice diagnostic</span>
                    )}
                </div>

                {status === 'error' && (
                    <div className="flex items-center gap-1 text-xs text-red-600 font-medium">
                        <AlertCircle className="w-3 h-3" /> {errorMessage}
                    </div>
                )}
            </div>
        </div>
    );
}
