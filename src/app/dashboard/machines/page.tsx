import { MachinesService } from '@/domain';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { getCurrentUserId, getCurrentUserFromSession } from '@/lib/auth-bridge';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import ListSkeleton from '@/components/dashboard/ListSkeleton';
import { MachineList } from '@/domain/assets/components/MachineList';
import { Plus } from 'lucide-react';

export default async function MachinesPage({
    searchParams,
}: {
    searchParams: { [key: string]: string | undefined };
}) {
    const userId = await getCurrentUserId();

    if (!userId) {
        redirect('/login');
    }

    const user = await getCurrentUserFromSession();

    // Parse search parameters for ERP table
    const params = {
        search: searchParams.search,
        make: searchParams.make,
        city: searchParams.city,
        year: searchParams.year,
        sort: searchParams.sort,
        dir: searchParams.dir as 'asc' | 'desc' | undefined,
        page: searchParams.page,
    };

    const { machines, totalPages } = await MachinesService.getMachines(params);

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold" data-marker="machines-list-v7.2">Equipment Inventory (V7.2)</h1>
                    <p className="text-slate-500">
                        Gérez votre parc machine et vos équipements.
                    </p>
                </div>

                {(user?.role === 'SUPER_ADMIN' || user?.role === 'ENVIROJIM_ADMIN') && (
                    <Link href="/dashboard/machines/create">
                        <Button variant="default" className="w-full sm:w-auto shadow-md">
                            <Plus className="mr-2 h-4 w-4" />
                            Ajouter une Machine
                        </Button>
                    </Link>
                )}
            </div>

            <Suspense fallback={<ListSkeleton />}>
                <MachineList
                    machines={machines}
                    totalPages={totalPages}
                    userRole={user?.role}
                />
            </Suspense>
        </div>
    );
}
