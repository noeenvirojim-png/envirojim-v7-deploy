import { UsersService } from '@/domain';
import { Button } from '@/components/ui/button';

export default async function TechniciansPage() {
    const technicians = await UsersService.getTechnicians();

    return (
        <div className="space-y-6 animate-in fade-in py-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold" data-marker="technicians-v7.2">User Directory (V7.2)</h1>
                <Button variant="industrial">+ Nouveau Technicien</Button>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {technicians.map((tech: any) => (
                    <div key={tech.id} className="bg-white border border-slate-100 rounded-xl p-6 space-y-4 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-xl bg-primary/5 flex items-center justify-center text-primary font-bold text-xl border border-primary/10">
                                {tech.fullName?.charAt(0) || '?'}
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-900">{tech.fullName}</h3>
                                <p className="text-xs text-slate-500 font-medium">{tech.email}</p>
                            </div>
                        </div>
                        <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded bg-slate-50 text-slate-400 border border-slate-100">
                                {tech.organization?.name || 'EnviroJim'}
                            </span>

                            <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider flex items-center gap-1.5">
                                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                Actif
                            </span>
                        </div>
                    </div>
                ))}

                {technicians.length === 0 && (
                    <div className="col-span-full py-20 text-center text-slate-400 italic">
                        Aucun technicien trouvé.
                    </div>
                )}
            </div>
        </div>
    );
}
