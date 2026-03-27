import React from 'react';
import Image from 'next/image'
import { cn } from '@/lib/utils';

interface LogoProps {
    className?: string;
    size?: number;
    showText?: boolean;
}

export function Logo({ className, size = 32, showText = false }: LogoProps) {
    return (
        <div className={cn("flex items-center gap-2", className)}>
            <div
                className="relative flex items-center justify-center overflow-hidden"
                style={{ width: size, height: size }}
            >
                <Image
                    src="/logo.png"
                    alt="EnviroJim logo"
                    width={size}
                    height={size}
                    className="object-contain brightness-110 drop-shadow-[0_0_8px_rgba(37,99,235,0.4)]"
                    priority
                />
            </div>

            {showText && (
                <div className="flex flex-col">
                    <span className="font-outfit font-black text-xl leading-none tracking-tighter text-white flex items-center gap-1 uppercase">
                        ENVIRO<span className="text-primary">JIM</span>
                        <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded ml-1 font-bold tracking-widest uppercase">V8</span>
                    </span>
                    <span className="text-[8px] font-black tracking-[0.3em] text-slate-500 uppercase mt-1">Industrial Intelligence</span>
                </div>
            )}
        </div>
    );
}
