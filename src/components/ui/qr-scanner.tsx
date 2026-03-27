'use client';

import React, { useState } from 'react';
import { Camera, QrCode, X, Search } from 'lucide-react';
import { Button } from './button';
import { Input } from './input';

interface QRScannerProps {
    onScan: (serialNumber: string) => void;
    onClose?: () => void;
}

export function QRScanner({ onScan, onClose }: QRScannerProps) {
    const [manualEntry, setManualEntry] = useState('');
    const [isScanning, setIsScanning] = useState(false);

    // In a real mobile environment, this would initialize an HTML5 QrCode scanner.
    // For this implementation, we simulate it via a manual entry or a mock button out of hardware constraints.

    const startScan = () => {
        setIsScanning(true);
        // Timeout to simulate successful hardware camera scan
        setTimeout(() => {
            const mockSerial = `SN-${Math.floor(Math.random() * 10000) + 1000}`;
            onScan(mockSerial);
            setIsScanning(false);
        }, 1500);
    };

    const handleManualSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (manualEntry.trim()) {
            onScan(manualEntry.trim().toUpperCase());
        }
    };

    return (
        <div className="flex flex-col bg-slate-900 text-white rounded-2xl overflow-hidden shadow-2xl relative w-full max-w-md mx-auto h-[500px]">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950">
                <div className="flex items-center gap-2">
                    <QrCode className="h-5 w-5 text-blue-400" />
                    <span className="font-semibold tracking-wide">Scanner Machine</span>
                </div>
                {onClose && (
                    <Button variant="ghost" size="icon" onClick={onClose} className="text-slate-400 hover:text-white rounded-full">
                        <X className="h-5 w-5" />
                    </Button>
                )}
            </div>

            {/* Scanner Area */}
            <div className="flex-1 relative flex items-center justify-center bg-black overflow-hidden group">
                {isScanning ? (
                    <>
                        {/* Animated Scanning HUD */}
                        <div className="absolute inset-8 border-2 border-green-500 rounded-lg opacity-70">
                            <div className="absolute top-0 left-0 w-full h-1 bg-green-400 shadow-[0_0_15px_#4ade80] animate-scan-line"></div>
                        </div>
                        <p className="absolute bottom-6 text-green-400 font-mono text-sm animate-pulse">Recherche du code QR...</p>
                    </>
                ) : (
                    <div className="flex flex-col items-center gap-4 text-slate-400">
                        <Camera className="h-16 w-16 opacity-50 mb-2" />
                        <Button onClick={startScan} size="lg" className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-8">
                            Activer la Caméra
                        </Button>
                        <span className="text-xs opacity-60 px-8 text-center">Placez le code QR de la machine au centre de l'écran</span>
                    </div>
                )}
            </div>

            {/* Manual Fallback Footer */}
            <div className="p-4 bg-slate-950 border-t border-slate-800">
                <form onSubmit={handleManualSubmit} className="flex gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                        <Input
                            placeholder="Saisie manuelle du N° Série..."
                            className="bg-slate-900 border-slate-700 text-white pl-9 placeholder:text-slate-500"
                            value={manualEntry}
                            onChange={(e) => setManualEntry(e.target.value)}
                        />
                    </div>
                    <Button type="submit" variant="secondary" disabled={!manualEntry.trim()} className="shrink-0 bg-slate-800 text-white hover:bg-slate-700">
                        Aller
                    </Button>
                </form>
            </div>
        </div>
    );
}
