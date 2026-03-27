import { Suspense } from 'react';
import PartsOrderTable from '@/domain/procurement/components/PartsOrderTable';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export const metadata = {
  title: 'Suivi des Pièces | EnviroJim',
  description: 'Gestion et suivi des commandes de pièces détachées.',
};

export default function PartsTrackingPage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h1 className="text-2xl font-bold" data-marker="parts-v7.2">Suivi des Pièces (V7.2)</h1>
        <Link href="/dashboard/parts/new-request">
          <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200 gap-2">
            <Plus className="h-4 w-4" /> Nouvelle Demande
          </Button>
        </Link>
      </div>
      
      <div className="space-y-4">
        <Suspense fallback={<div>Chargement du tableau...</div>}>
          <PartsOrderTable />
        </Suspense>
      </div>
    </div>
  );
}
