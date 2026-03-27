import { TicketsService } from '@/domain/support/data/tickets';
import { MachinesService } from '@/domain/assets/data/machines';
import { UsersService } from '@/domain/identity/data/users';
import { MaintenanceService } from '@/domain/maintenance/data/maintenance';
import { getCurrentUserFromSession } from '@/lib/auth-bridge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Filter, Calendar } from 'lucide-react';
import TicketInbox from '@/domain/support/components/TicketInbox';
import NewTicketModal from '@/domain/support/components/NewTicketModal';
import TechAgendaSidebar from '@/domain/support/components/TechAgendaSidebar';

export default async function TicketsHubPage() {
    const user = await getCurrentUserFromSession();
    if (!user) return <div className="p-8">Accès Refusé</div>;

    // Parallel fetch for all hub data
    const [tickets, machines, technicians, interventions] = await Promise.all([
        TicketsService.getTickets(),
        MachinesService.getMachines(),
        UsersService.getTechnicians(),
        MaintenanceService.getInterventions()
    ]);

    return (
        <div className="flex flex-col h-[calc(100vh-4rem)] bg-white overflow-hidden">
            {/* Unified Hub Header */}
            <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100 bg-white shadow-sm z-10 shrink-0">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900" data-marker="tickets-v7.2">Support Hub (V7.2)</h1>
                    <div className="flex items-center gap-4 mt-1">
                        <p className="text-slate-500 text-sm italic">Inbox unifiée pour répartiteurs et clients.</p>
                        <span className="h-4 w-px bg-slate-200"></span>
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 uppercase tracking-wider">
                            <span className="h-2 w-2 rounded-full bg-emerald-500 pulse"></span>
                            Live Sync Active
                        </div>
                    </div>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline" className="gap-2 rounded-xl border-slate-200 hover:bg-slate-50 text-xs font-bold h-10 px-4">
                        <Filter className="h-4 w-4 text-slate-400" /> Filtres
                    </Button>
                    <NewTicketModal machines={machines} />
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex overflow-hidden">
                <div className="flex-1 overflow-hidden p-6 gap-6 flex">
                    <TicketInbox tickets={tickets} />
                </div>
                
                {/* Tech Agenda Sidebar */}
                <TechAgendaSidebar 
                    technicians={technicians} 
                    interventions={interventions} 
                />
            </div>
        </div>
    );
}
