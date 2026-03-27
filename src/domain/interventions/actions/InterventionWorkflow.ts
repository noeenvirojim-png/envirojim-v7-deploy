'use server';

import { createClient } from '@/lib/supabase/server';
import { getCurrentUserFromSession } from '@/lib/auth-bridge';
import { processVoiceNote } from './VoiceToTextProcessor';
import { sendInterventionAlert } from './InterventionAlertEngine';
import { Intervention } from '@/types/schema';

export async function getInterventions() {
    const user = await getCurrentUserFromSession();
    if (!user) throw new Error('Unauthorized');
    const supabase = createClient();

    const { data: interventions, error } = await supabase
        .from('interventions')
        .select(`
            *,
            machine:machines(serial_number, make, model)
        `)
        .eq('organization_id', user.organization_id)
        .order('planned_date', { ascending: false });

    if (error) throw error;

    // Map to logic expected by UI stub
    return interventions.map(i => ({
        id: i.id,
        SN: i.machine?.serial_number || 'TBD',
        machine: `${i.machine?.make} ${i.machine?.model}`,
        technicien: i.technician_name,
        type: i.intervention_type,
        datePlanifiee: i.planned_date,
        dateRealisation: i.realized_date || '',
        statut: i.status,
        notes: i.notes || '',
        piecesUtilisees: i.pieces_used || '',
        pdfLink: i.pdf_url || '#'
    }));
}

export async function triggerInterventionWorkflow(row: any, voiceNoteUrl: string) {
    const transcription = await processVoiceNote(voiceNoteUrl);
    await sendInterventionAlert({ ...row, notes: transcription });
    return { success: true, transcription };
}
