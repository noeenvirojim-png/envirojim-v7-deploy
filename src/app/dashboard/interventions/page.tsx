import { MaintenanceService, MachinesService, ProcurementService } from '@/domain';
import { getCurrentUserId } from '@/lib/auth-bridge';
import InterventionForm from '@/domain/maintenance/components/InterventionForm';
import { Badge } from '@/components/ui/badge';

export default async function InterventionsPage() {
    const userId = await getCurrentUserId();
    if (!userId) return null;

    const [interventions, machines, parts] = await Promise.all([
        MaintenanceService.getInterventions(),
        MachinesService.getMachines(),
        ProcurementService.getPartsCatalog()
    ]);

    return (
        <div className="space-y-10 animate-in fade-in py-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold" data-marker="interventions-v7.2">Technician Interventions (V7.2)</h1>
            </div>

            <div className="grid gap-8 lg:grid-cols-3">
                {/* Creation Form for Techs */}
                <div className="lg:col-span-1 space-y-6">
                    <InterventionForm machines={machines as any[]} parts={parts as any[]} />
                </div>

                {/* History List */}
                <div className="lg:col-span-2 space-y-6">
                    <h2 className="text-xl font-semibold text-slate-900">Historique Récent</h2>
                    <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50/50 text-slate-400 uppercase text-xs font-semibold">
                                <tr>
                                    <th className="px-6 py-4">Machine</th>
                                    <th className="px-6 py-4">Technicien</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4 text-right">Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {interventions.map((item: any) => (
                                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-5">
                                            <div className="font-semibold text-slate-900">{item.machine?.make} {item.machine?.model}</div>
                                            <div className="text-xs text-slate-500 font-mono mt-0.5">{item.machine?.serialNumber}</div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="text-slate-600">{item.technician?.fullName}</div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <Badge
                                                variant={item.isCompleted ? 'success' : 'secondary'}
                                                className={item.isCompleted ? 'bg-emerald-50 text-emerald-600 border-none' : 'bg-slate-50 text-slate-500 border-none'}
                                            >
                                                {item.isCompleted ? 'Complété' : 'En cours'}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-5 text-right text-slate-400 text-xs">
                                            {new Date(item.createdAt).toLocaleDateString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {interventions.length === 0 && (
                            <div className="px-6 py-20 text-center text-slate-400 italic">
                                Aucune intervention enregistrée.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}


