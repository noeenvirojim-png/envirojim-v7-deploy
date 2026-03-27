'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { OrderCreator } from './OrderCreator.client';

export function OrderCreatorWrapper({ isAdmin }: { isAdmin: boolean }) {
    const [open, setOpen] = useState(false);

    if (!isAdmin) return null;

    return (
        <>
            <Button 
                onClick={() => setOpen(true)}
                className="bg-brand-primary hover:bg-brand-primary/90 text-white font-black px-6 rounded-2xl shadow-lg shadow-emerald-200/50 gap-2"
            >
                <Plus size={18} />
                New Request
            </Button>
            <OrderCreator open={open} onOpenChange={setOpen} />
        </>
    );
}
