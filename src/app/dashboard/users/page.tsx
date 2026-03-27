import { Suspense } from 'react';
import { UsersService } from '@/domain/identity/data/users';
import { UserTable } from './UserTable.client';
import { Skeleton } from '@/components/ui/skeleton';
import { getCurrentUserFromSession } from '@/lib/auth-bridge';
import { redirect } from 'next/navigation';

export default async function usersPage() {
    const user = await getCurrentUserFromSession();
    
    // Auth Protection: ENVIROJIM_ADMIN or SUPER_ADMIN required
    if (!user || (user.role !== 'SUPER_ADMIN' && user.role !== 'ENVIROJIM_ADMIN')) {
        redirect('/dashboard');
    }

    const users = await UsersService.getAllUsers();

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in-up">
            <div className="flex flex-col gap-2">
                <h1 className="text-4xl font-black text-slate-900 tracking-tight">
                    Gestion des Accès
                </h1>
                <p className="text-slate-500 text-lg font-medium">
                    Contrôlez les rôles et les permissions de tous les utilisateurs de la plateforme.
                </p>
            </div>

            <Suspense fallback={<UserTableSkeleton />}>
                <UserTable users={users as any} />
            </Suspense>
        </div>
    );
}

function UserTableSkeleton() {
    return (
        <div className="space-y-4">
            <Skeleton className="h-12 w-full rounded-xl" />
            <Skeleton className="h-64 w-full rounded-xl" />
        </div>
    );
}
