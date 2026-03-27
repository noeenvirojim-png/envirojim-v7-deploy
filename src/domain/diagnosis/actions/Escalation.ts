'use server';

import { createClient } from '@/lib/supabase/server';
import { getCurrentUserFromSession } from '@/lib/auth-bridge';

/**
 * Support Ticket Escalation
 * Creates a internal support ticket in EnviroJim when a diagnostic fails.
 */
export async function escalateToDealer(params: {
    machineId: string;
    sessionId: string;
    diagLog: string;
    errorCode?: string;
    photos?: string[];
}) {
    const user = await getCurrentUserFromSession();
    if (!user) throw new Error('Unauthorized');
    const supabase = createClient();

    // 1. Create a support ticket record
    const { data: ticket, error } = await supabase
        .from('tickets')
        .insert({
            organization_id: user.organization_id,
            machine_id: params.machineId,
            title: `[ESCALATION IA] Échec Diagnostic - ${params.machineId}`,
            description: `Le diagnostic guidé a échoué après 5 étapes.\n\nHistorique :\n${params.diagLog}\n\nCode detected: ${params.errorCode || 'None'}`,
            priority: 'HIGH',
            status: 'OPEN',
            metadata: {
                ai_escalated: true,
                diag_session_id: params.sessionId,
                photos: params.photos
            }
        })
        .select()
        .single();

    if (error) throw error;

    // 2. Trigger notification (Placeholder)
    console.log(`[Escalation] Support Ticket Created: ${ticket.id}`);

    return { 
        success: true, 
        ticketId: ticket.id,
        message: "Pour assurer une résolution rapide, vous pouvez contacter votre dealer." 
    };
}
