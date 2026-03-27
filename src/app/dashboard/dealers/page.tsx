import { OrganizationsService } from '@/domain/identity/data/organizations';
import { Badge } from '@/components/ui/badge';
import OrganizationModal from '@/domain/identity/components/OrganizationModal';
import { Truck, Search, ExternalLink, ShieldCheck } from 'lucide-react';

export default async function DealersPage() {
    const dealers = await OrganizationsService.getOrganizations('DEALER');

    return (
        <div className="space-y-6 py-8 px-4 max-w-7xl mx-auto">
            {/* Header section with Stats */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-100">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <div className="bg-amber-100 p-2 rounded-lg text-amber-600">
                           <Truck className="h-5 w-5" />
                        </div>
                        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Réseau de Distributeurs</h1>
                    </div>
                    <p className="text-slate-500 text-sm">Gérez vos concessionnaires, centres de service et partenaires logistiques.</p>
                </div>
                <div className="flex items-center gap-3">
                    <OrganizationModal mode="CREATE" type="DEALER" />
                </div>
            </div>

            {/* Quick Stats & Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Concessionnaires</p>
                    <p className="text-2xl font-bold text-slate-900">{dealers.length}</p>
                </div>
                <div className="md:col-span-2 p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center gap-3">
                   <Search className="h-4 w-4 text-slate-400" />
                   <input 
                        className="bg-transparent border-none focus:ring-0 text-sm w-full placeholder:text-slate-400" 
                        placeholder="Rechercher un dealer..."
                   />
                </div>
            </div>

            {/* Organizations Table */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100">
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-tight">Partenaire</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-tight">Référence QB</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-tight">Certification</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-tight text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {dealers.map((dealer: any) => (
                                <tr key={dealer.id} className="group hover:bg-slate-50/30 transition-all">
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 font-bold group-hover:bg-amber-50 group-hover:text-amber-600 transition-colors">
                                                {dealer.name.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-900">{dealer.name}</p>
                                                <p className="text-[10px] text-slate-400 font-mono tracking-tighter">REF: {dealer.id.split('-')[0]}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        {dealer.qbCustomerId ? (
                                            <code className="bg-slate-100 px-2 py-0.5 rounded text-[11px] font-bold text-slate-600">{dealer.qbCustomerId}</code>
                                        ) : (
                                            <span className="text-slate-300 italic text-xs">Non configuré</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-1.5 text-amber-600">
                                            <ShieldCheck className="h-4 w-4" />
                                            <span className="text-[10px] font-bold uppercase">Officiel</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <OrganizationModal mode="EDIT" type="DEALER" initialData={dealer} />
                                            <Badge className="bg-slate-100 text-slate-600 hover:bg-slate-200 cursor-pointer text-[10px] border-none font-bold">
                                                GÉRER
                                            </Badge>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {dealers.length === 0 && (
                    <div className="py-20 flex flex-col items-center justify-center text-slate-400 bg-slate-50/30">
                        <Truck className="h-12 w-12 text-slate-200 mb-3" />
                        <p className="font-medium">Aucun concessionnaire trouvé</p>
                        <p className="text-xs">Étendez votre réseau en ajoutant un nouveau partenaire.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
