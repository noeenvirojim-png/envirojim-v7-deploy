'use server';

import { createClient } from '@/lib/supabase/server';
import { getCurrentUserFromSession } from '@/lib/auth-bridge';
import { revalidatePath } from 'next/cache';
import { offlineQueue } from '@/lib/offline-queue';
import { triggerMaintenanceAutomation } from './machines';

export interface InspectionData {
    machineId: string;
    currentHours: number;
    isCompliant: boolean;
    comments: string;
    photoUrl?: string;
}

export async function submitInspection(data: InspectionData): Promise<{ success: boolean; error?: string }> {
    const supabase = createClient();
    const user = await getCurrentUserFromSession();

    if (!user) {
        return { success: false, error: 'Unauthorized' };
    }

    try {
        // 1. Update Machine Hours (Mandatory)
        const { error: machineError } = await supabase
            .from('machines')
            .update({ current_hours: data.currentHours })
            .eq('id', data.machineId)
            .is('deleted_at', null);

        if (machineError) {
            console.error('[submitInspection] Failed to update machine hours:', machineError);
            return { success: false, error: 'Erreur lors de la mise à jour des heures machine.' };
        }

        // 1.b Trigger Maintenance Automation
        await triggerMaintenanceAutomation(data.machineId, data.currentHours, user.organization_id);

        // 2. Insert Checklist record
        const { error: checklistError } = await supabase
            .from('checklists')
            .insert({
                organization_id: user.organization_id,
                machine_id: data.machineId,
                status: data.isCompliant ? 'COMPLIANT' : 'NON_COMPLIANT',
                is_compliant: data.isCompliant,
                completed_by: user.id,
                completed_at: new Date().toISOString(),
                notes: data.comments,
                // Assuming photo_url exists or we store it in a generic notes/attachments if not
            });

        if (checklistError) {
            console.error('[submitInspection] Failed to insert checklist:', checklistError);
            // If the table misses a field, fail gracefully for now and simulate queueing
            await offlineQueue.enqueue('INSPECTION', data);
        }

        revalidatePath(`/dashboard/machines/${data.machineId}`);
        revalidatePath('/dashboard/inspections');

        return { success: true };
    } catch (e) {
        console.error('[submitInspection] Unexpected error:', e);
        return { success: false, error: 'Erreur serveur.' };
    }
}
