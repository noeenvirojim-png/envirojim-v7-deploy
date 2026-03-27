'use server';

import { createClient } from '@/lib/supabase/server';
import { getCurrentUserFromSession } from '@/lib/auth-bridge';

export async function sendInternalMaintenanceEmail(ticketId: string) {
    const user = await getCurrentUserFromSession();
    if (!user) return { success: false, error: 'Unauthorized' };

    const supabase = createClient();

    try {
        const { data: ticket } = await supabase
            .from('internal_tickets')
            .select(`
                *,
                machine:machines(serial_number, make, model)
            `)
            .eq('id', ticketId)
            .single();

        if (!ticket) throw new Error('Ticket not found');

        // Construct pre-filled mailto content for internal use
        const subject = `[INTERNAL ALERT] Problème Maintenance - ${ticket.machine.make} ${ticket.machine.model} (#${ticket.machine.serial_number})`;
        const body = `
            ATTENTION SUPERVISEUR,

            Un problème a été détecté lors de l'inspection quotidienne.

            MACHINE: ${ticket.machine.make} ${ticket.machine.model}
            SN: ${ticket.machine.serial_number}
            TICKET: ${ticket.title}
            DESCRIPTION: ${ticket.description}

            LIEN DASHBOARD: ${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/machines/${ticket.machine_id}#maintenance

            Cordialement,
            Système EnviroJim V7.2
        `;

        const mailto = `mailto:supervisor@client.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        
        return { success: true, mailto };
    } catch (e: any) {
        console.error('[sendInternalMaintenanceEmail Error]', e);
        return { success: false, error: e.message };
    }
}

export async function checkMaintenanceAlerts() {
    // This would typically run in a cron job or background worker
    const supabase = createClient();

    try {
        // Find machines where current_hours is within 150h of any active maintenance rule
        const { data: rules } = await supabase
            .from('maintenance_rules')
            .select(`
                *,
                machine:machines(current_hours, organization_id)
            `)
            .eq('is_active', true);

        for (const rule of (rules || [])) {
            const diff = rule.interval_hours - rule.machine.current_hours;
            if (diff <= 150 && diff > 0) {
                // Update rule alert level
                await supabase
                    .from('maintenance_rules')
                    .update({ alert_level: 'WARNING' })
                    .eq('id', rule.id);
            } else if (diff <= 0) {
                 await supabase
                    .from('maintenance_rules')
                    .update({ alert_level: 'CRITICAL' })
                    .eq('id', rule.id);
            }
        }
        
        return { success: true };
    } catch (e: any) {
        console.error('[checkMaintenanceAlerts Error]', e);
        return { success: false, error: e.message };
    }
}
