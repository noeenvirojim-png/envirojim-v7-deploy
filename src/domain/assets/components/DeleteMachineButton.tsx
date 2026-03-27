'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { deleteMachine } from '@/domain/assets/actions/machines';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

interface DeleteMachineButtonProps {
    machineId: string;
}

export function DeleteMachineButton({ machineId }: DeleteMachineButtonProps) {
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleDelete = async () => {
        if (!confirm('Êtes-vous sûr de vouloir supprimer cette machine ? Cette action est irréversible.')) return;

        setLoading(true);
        const result = await deleteMachine(machineId);

        if (result.success) {
            router.push('/dashboard/machines');
            router.refresh();
        } else {
            alert('Erreur lors de la suppression: ' + result.message);
            setLoading(false);
        }
    };

    return (
        <Button
            variant="destructive"
            size="sm"
            className="gap-2"
            onClick={handleDelete}
            disabled={loading}
        >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            Supprimer
        </Button>
    );
}
