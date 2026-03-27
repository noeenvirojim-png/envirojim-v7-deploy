'use client'

import { useState } from 'react';
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle, 
    DialogTrigger 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import TicketForm from './TicketForm';
import { Machine } from '@/types/schema';

interface NewTicketModalProps {
    machines: Machine[];
}

export default function NewTicketModal({ machines }: NewTicketModalProps) {
    const [open, setOpen] = useState(false);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-lg transition-all hover:scale-[1.02]">
                    <Plus className="h-4 w-4" /> Nouveau Ticket
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden border-none bg-white shadow-2xl">
                <DialogHeader className="p-6 bg-slate-50 border-b border-slate-100">
                    <DialogTitle className="text-xl font-bold text-slate-900">Ouvrir un Nouveau Ticket</DialogTitle>
                </DialogHeader>
                <div className="p-0">
                    <TicketForm 
                        machines={machines} 
                        onSuccess={() => setOpen(false)} 
                        onCancel={() => setOpen(false)} 
                    />
                </div>
            </DialogContent>
        </Dialog>
    );
}
