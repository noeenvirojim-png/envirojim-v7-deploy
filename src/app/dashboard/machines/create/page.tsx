import { getCurrentUserFromSession } from '@/lib/auth-bridge';
import { redirect } from 'next/navigation';
import MachineCreator from '@/domain/assets/components/MachineCreator.client';
export default async function CreateMachinePage() {
    const user = await getCurrentUserFromSession();

    // STRICT ACCESS CONTROL: Only Internal Admins can create machines
    if (!user || (user.role !== 'SUPER_ADMIN' && user.role !== 'ENVIROJIM_ADMIN')) {
        redirect('/dashboard');
    }

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
      <h1 className="text-2xl font-bold" data-marker="manual-multi-v7.2">Add New Machine (V7.2)</h1>
            <MachineCreator />
        </div>
    );
}
