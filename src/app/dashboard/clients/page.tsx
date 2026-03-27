import { OrganizationsService } from '@/domain/identity/data/organizations';
import { Badge } from '@/components/ui/badge';
import OrganizationModal from '@/domain/identity/components/OrganizationModal';
import { Building2, Plus, Search, ExternalLink, UserPlus, Send, History } from 'lucide-react';
import { Input } from '@/components/ui/input';
import ClientOnboardingForm from '@/domain/clients/components/ClientOnboardingForm';
import { ClientsListV8 } from '@/domain/clients/components/ClientsListV8';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default async function ClientsPage() {
    const organizations = await OrganizationsService.getOrganizations('CLIENT');

    return (
        <div className="space-y-6 py-8 px-4 max-w-7xl mx-auto">
            {/* Header section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-100">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <div className="bg-blue-600 p-2 rounded-xl text-white shadow-lg shadow-blue-100">
                           <Building2 className="h-6 w-6" />
                        </div>
                        <h1 className="text-3xl font-black tracking-tight text-slate-900 uppercase">Gestion Clients V8</h1>
                    </div>
                    <p className="text-slate-500 text-sm font-medium">Administration des portefeuilles clients, accès OAuth et parcs machines.</p>
                </div>
            </div>

            <Tabs defaultValue="onboarding" className="space-y-6">
                <TabsList className="bg-slate-100 p-1 rounded-2xl h-14 w-fit">
                    <TabsTrigger value="onboarding" className="rounded-xl px-8 font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">
                        <UserPlus className="w-4 h-4 mr-2" /> ONBOARDING V8
                    </TabsTrigger>
                    <TabsTrigger value="organizations" className="rounded-xl px-8 font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">
                        <History className="w-4 h-4 mr-2" /> ORGANISATIONS
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="onboarding" className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-1">
                            <ClientOnboardingForm />
                        </div>
                        <div className="lg:col-span-2">
                            <ClientsListV8 />
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="organizations" className="animate-in fade-in">
                    {/* Legacy Organizations Table */}
                    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                        <div className="p-6 border-b border-slate-50 flex justify-between items-center">
                            <h3 className="font-bold text-slate-900">Historique des Organisations</h3>
                            <OrganizationModal mode="CREATE" type="CLIENT" />
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/50 border-b border-slate-100">
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-tight">Organisation</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-tight">QuickBooks ID</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-tight">Statut</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-tight text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {organizations.map((org: any) => (
                                        <tr key={org.id} className="group hover:bg-slate-50/30 transition-all">
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 font-bold group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                                                        {org.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-900">{org.name}</p>
                                                        <p className="text-[10px] text-slate-400 font-mono tracking-tighter">ID: {org.id.split('-')[0]}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                {org.qbCustomerId ? (
                                                    <div className="flex items-center gap-2 text-slate-600">
                                                        <code className="bg-slate-100 px-2 py-0.5 rounded text-[11px] font-bold">{org.qbCustomerId}</code>
                                                        <ExternalLink className="h-3 w-3 text-slate-300" />
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-300 italic text-xs">Non lié</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-5">
                                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-100 text-[10px] font-bold rounded-md">
                                                    ACTIF
                                                </Badge>
                                            </td>
                                            <td className="px-6 py-5 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <OrganizationModal mode="EDIT" type="CLIENT" initialData={org} />
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
