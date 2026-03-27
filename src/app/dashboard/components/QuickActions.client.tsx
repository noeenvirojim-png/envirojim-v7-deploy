'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PlusCircle, PackagePlus, Stethoscope, FileText, Settings2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function QuickActions() {
    const router = useRouter();

    const actions = [
        {
            title: 'New Machine',
            icon: PlusCircle,
            href: '/dashboard/machines/create',
            color: 'bg-blue-600',
            bg: 'bg-blue-50'
        },
        {
            title: 'Request Parts',
            icon: PackagePlus,
            href: '/dashboard/procurement/request',
            color: 'bg-purple-600',
            bg: 'bg-purple-50'
        },
        {
            title: 'Start Diagnostic',
            icon: Stethoscope,
            href: '/dashboard/diagnosis',
            color: 'bg-amber-600',
            bg: 'bg-amber-50'
        },
        {
            title: 'Intervention',
            icon: FileText,
            href: '/dashboard/interventions/create',
            color: 'bg-green-600',
            bg: 'bg-green-50'
        }
    ];

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {actions.map((action, i) => (
                <Button
                    key={i}
                    variant="outline"
                    className="h-auto py-4 flex flex-col items-center justify-center gap-2 border-slate-200 hover:border-brand-primary hover:bg-slate-50 transition-all group"
                    onClick={() => router.push(action.href)}
                >
                    <div className={`p-2 rounded-lg ${action.bg} text-slate-600 group-hover:scale-110 transition-transform`}>
                        <action.icon className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-semibold text-slate-700">{action.title}</span>
                </Button>
            ))}
        </div>
    );
}
