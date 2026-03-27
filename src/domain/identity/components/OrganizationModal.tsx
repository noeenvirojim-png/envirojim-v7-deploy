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
import { Plus, Edit2 } from 'lucide-react';
import OrganizationForm from './OrganizationForm';
import { Organization } from '@/types/schema';

interface OrganizationModalProps {
    initialData?: Partial<Organization>;
    type: 'CLIENT' | 'DEALER';
    mode: 'CREATE' | 'EDIT';
}

export default function OrganizationModal({ initialData, type, mode }: OrganizationModalProps) {
    const [open, setOpen] = useState(false);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {mode === 'CREATE' ? (
                    <Button className="gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-lg transition-all hover:scale-[1.02] rounded-xl">
                        <Plus className="h-4 w-4" /> {type === 'CLIENT' ? 'Ajouter Client' : 'Ajouter Dealer'}
                    </Button>
                ) : (
                    <Button variant="ghost" size="sm" className="text-blue-600 hover:bg-blue-50 h-8 w-8 p-0">
                        <Edit2 className="h-4 w-4" />
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden border-none bg-white shadow-2xl">
                <DialogHeader className="p-6 bg-slate-50 border-b border-slate-100">
                    <DialogTitle className="text-xl font-bold text-slate-900">
                        {mode === 'CREATE' ? `Nouveau ${type === 'CLIENT' ? 'Client' : 'Dealer'}` : 'Modifier l’Organisation'}
                    </DialogTitle>
                </DialogHeader>
                <div className="p-0">
                    <OrganizationForm 
                        type={type} 
                        initialData={initialData}
                        onSuccess={() => {
                            setOpen(false);
                            window.location.reload(); // Refresh to show new data
                        }} 
                        onCancel={() => setOpen(false)} 
                    />
                </div>
            </DialogContent>
        </Dialog>
    );
}
