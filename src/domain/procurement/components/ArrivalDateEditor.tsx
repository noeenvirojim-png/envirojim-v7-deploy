'use client';

import { useState } from 'react';
import { updatePartsOrderArrival } from '../actions/parts_orders';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface ArrivalDateEditorProps {
  orderId: string;
  currentDate?: string;
}

export function ArrivalDateEditor({ orderId, currentDate }: ArrivalDateEditorProps) {
  const [date, setDate] = useState(currentDate || '');
  const [loading, setLoading] = useState(false);

  const handleUpdate = async () => {
    setLoading(true);
    try {
      await updatePartsOrderArrival(orderId, date);
      toast({ title: 'Succès', description: 'Date d\'arrivée mise à jour.' });
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Input 
        type="date" 
        value={date} 
        onChange={(e) => setDate(e.target.value)}
        className="w-40"
      />
      <Button size="sm" onClick={handleUpdate} disabled={loading}>
        {loading ? '...' : 'OK'}
      </Button>
    </div>
  );
}
