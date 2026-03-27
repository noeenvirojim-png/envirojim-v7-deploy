'use client';

import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';

interface PDFViewerProps {
    fileUrl: string;
}

export function PDFViewer({ fileUrl }: PDFViewerProps) {
    const [isLoading, setIsLoading] = useState(true);

    return (
        <div className="relative w-full h-full bg-slate-100 flex items-center justify-center rounded-lg overflow-hidden border border-slate-200">
            {isLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 z-10">
                    <Loader2 className="h-8 w-8 text-blue-600 animate-spin mb-2" />
                    <span className="text-sm text-slate-500 font-medium animate-pulse">Chargement sécurisé du document...</span>
                </div>
            )}
            <iframe
                src={`${fileUrl}#view=FitH&toolbar=0`}
                className={`w-full h-full border-0 transition-opacity duration-500 z-20 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
                title="Manuel Technique PDF"
                onLoad={() => setIsLoading(false)}
            />
        </div>
    );
}
