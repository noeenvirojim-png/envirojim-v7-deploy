import { Suspense } from 'react';
import AdminPartsOrderTable from '@/domain/procurement/components/AdminPartsOrderTable';
import { isAdmin } from '@/lib/auth-bridge';
import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Admin - Gestion des Pièces | EnviroJim',
};

export default async function AdminPartsPage() {
  const isUserAdmin = await isAdmin();
  
  if (!isUserAdmin) {
    redirect('/dashboard');
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight text-primary">Gestion des Arrivées (Admin)</h2>
      </div>
      
      <div className="grid gap-4">
        <Suspense fallback={<div>Chargement des commandes...</div>}>
          <AdminPartsOrderTable />
        </Suspense>
      </div>
    </div>
  );
}
