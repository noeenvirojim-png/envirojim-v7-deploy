import { ProcurementService } from '@/domain';
import { getCurrentUserId } from '@/lib/auth-bridge';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { PartsTable } from '@/domain/procurement/components/PartsTable';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Loader2, PackageSearch } from 'lucide-react';

export default async function InventoryPage() {
    const userId = await getCurrentUserId();

    if (!userId) {
        redirect('/login');
    }

    const parts = await ProcurementService.getPartsCatalog();

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-primary">
                        Inventory
                    </h1>
                    <p className="text-slate-500">
                        Master parts catalog and pricing.
                    </p>
                </div>
                <Link href="/dashboard/inventory/request">
                    <Button className="shadow-lg shadow-accent/20 font-bold" variant="default">
                        <PackageSearch className="w-4 h-4 mr-2" />
                        Create Request
                    </Button>
                </Link>
            </div>

            <Suspense fallback={
                <div className="flex items-center justify-center p-12">
                    <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
                </div>
            }>
                <PartsTable parts={parts as any[]} />
            </Suspense>
        </div>
    );
}
