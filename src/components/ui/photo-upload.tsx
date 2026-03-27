'use client';

import React, { useState } from 'react';
import { Camera, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PhotoUploadProps {
    onImageSelected: (base64: string) => void;
}

export function PhotoUpload({ onImageSelected }: PhotoUploadProps) {
    const [preview, setPreview] = useState<string | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64 = reader.result as string;
                setPreview(base64);
                onImageSelected(base64);
            };
            reader.readAsDataURL(file);
        }
    };

    const clear = () => {
        setPreview(null);
        onImageSelected('');
    };

    return (
        <div className="relative">
            {preview ? (
                <div className="relative rounded-2xl overflow-hidden border-2 border-brand-primary shadow-lg animate-in zoom-in-95 duration-300">
                    <img src={preview} alt="Screen Preview" className="w-full h-48 object-cover" />
                    <Button 
                        size="icon" 
                        variant="destructive" 
                        className="absolute top-2 right-2 rounded-full h-8 w-8"
                        onClick={clear}
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            ) : (
                <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50 hover:bg-slate-100 hover:border-brand-primary/50 transition-all cursor-pointer group">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Camera className="w-10 h-10 text-slate-400 group-hover:text-brand-primary group-hover:scale-110 transition-all mb-3" />
                        <p className="mb-2 text-sm text-slate-500">
                            <span className="font-semibold">Prendre une photo</span> ou uploader
                        </p>
                        <p className="text-xs text-slate-400">Écran machine (CAT, Volvo, Cummins)</p>
                    </div>
                    <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                </label>
            )}
        </div>
    );
}
