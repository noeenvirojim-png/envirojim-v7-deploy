import { MachinesService } from '@/domain';
import { getCurrentUserId } from '@/lib/auth-bridge';
import TicketForm from '@/domain/support/components/TicketForm';
import { redirect } from 'next/navigation';

export default async function CreateTicketPage() {
    const userId = await getCurrentUserId();
    if (!userId) redirect('/login');

    const machines = await MachinesService.getMachines();

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold">Nouveau Ticket</h1>
                <p className="text-slate-500">Ouvrez une nouvelle demande de support pour une machine spécifique.</p>
            </div>

            {/* @ts-ignore TicketForm props issue */}
            <TicketForm machines={machines} />
        </div>
    );
}
