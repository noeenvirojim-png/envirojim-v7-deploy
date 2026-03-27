import { getCurrentUserId, getCurrentUserFromSession } from '@/lib/auth-bridge'
import { redirect } from 'next/navigation'
import { MachinesService, ProcurementService } from '@/domain';
import { PartRequestForm } from '@/domain/procurement/components/PartRequestForm';
import { Badge } from '@/components/ui/badge'
import { Wrench } from 'lucide-react'

export default async function NewPartRequestPage() {
    const userId = await getCurrentUserId()
    if (!userId) {
        redirect('/login')
    }

    const user = await getCurrentUserFromSession();
    if (!user) redirect('/login');

    // Parallel fetch using services
    const [catalogParts, machines] = await Promise.all([
        ProcurementService.getPartsCatalog(),
        MachinesService.getMachines()
    ]);

    return (
        <div className="space-y-6 animate-in fade-in py-6">
            <div className="flex flex-col space-y-1">
                <div className="flex items-center gap-2">
                    <h1 className="text-3xl font-bold tracking-tight text-primary">Nouvelle Demande de Pièces</h1>
                    <Badge variant="outline" className="text-slate-500 border-slate-200 bg-slate-50">
                        <Wrench className="w-3 h-3 mr-1" />
                        Maintenance
                    </Badge>
                </div>
                <p className="text-slate-500 text-balance max-w-2xl text-sm">
                    Sélectionnez les pièces du catalogue et assignez-les à une machine spécifique.
                    Les demandes sont soumises à approbation.
                </p>
            </div>

            <div className="h-px bg-slate-100 my-4" />

            <PartRequestForm
                catalogParts={catalogParts as any[]}
                machines={machines as any[]}
                userId={userId}
                organizationId={user.organization_id}
            />
        </div>
    )
}
