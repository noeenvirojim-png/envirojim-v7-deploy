'use server';

import { createClient } from '@/lib/supabase/server';
import { getCurrentUserFromSession } from '@/lib/auth-bridge';
import { revalidatePath } from 'next/cache';
import { InternalTicketStatus } from '@/types/schema';

export async function createInternalTicket(data: {
    machine_id: string;
    title: string;
    description: string;
    audio_url?: string;
}) {
    const user = await getCurrentUserFromSession();
    if (!user) return { success: false, error: 'Unauthorized' };

    const supabase = createClient();

    try {
        const { data: ticket, error } = await supabase.from('internal_tickets').insert({
            organization_id: user.organization_id,
            machine_id: data.machine_id,
            creator_id: user.id,
            title: data.title,
            description: data.description,
            status: 'OPEN',
            is_transferred_to_envirojim: false
        }).select('id').single();

        if (error) throw error;

        if (data.audio_url) {
            await supabase.from('notes_vocal').insert({
                ticket_id: ticket.id,
                audio_url: data.audio_url,
                transcription: 'Processing...',
                formatted_text: 'Processing...'
            });
        }

        revalidatePath(`/dashboard/machines/${data.machine_id}`);
        return { success: true, ticketId: ticket.id };
    } catch (e: any) {
        console.error('[createInternalTicket Error]', e);
        return { success: false, error: e.message };
    }
}

export async function updateInternalTicketStatus(ticketId: string, status: InternalTicketStatus, supervisorNotes?: string) {
    const user = await getCurrentUserFromSession();
    if (!user) return { success: false, error: 'Unauthorized' };

    const supabase = createClient();

    try {
        const updates: any = { status };
        if (supervisorNotes) {
            // Append to array
            const { data: current } = await supabase.from('internal_tickets').select('supervisor_notes').eq('id', ticketId).single();
            updates.supervisor_notes = [...(current?.supervisor_notes || []), supervisorNotes];
        }

        const { error } = await supabase.from('internal_tickets').update(updates).eq('id', ticketId);
        if (error) throw error;

        return { success: true };
    } catch (e: any) {
        console.error('[updateInternalTicketStatus Error]', e);
        return { success: false, error: e.message };
    }
}

export async function transferToEnviroJim(ticketId: string) {
    const user = await getCurrentUserFromSession();
    if (!user) return { success: false, error: 'Unauthorized' };

    const supabase = createClient();

    try {
        const { data: ticket } = await supabase.from('internal_tickets').select('*').eq('id', ticketId).single();
        if (!ticket) throw new Error('Ticket not found');

        // Create a formal ticket in the main 'tickets' table
        const { error: formalError } = await supabase.from('tickets').insert({
            organization_id: ticket.organization_id,
            machine_id: ticket.machine_id,
            created_by: ticket.creator_id,
            title: `[EXTERNAL TRANSFER] ${ticket.title}`,
            description: ticket.description,
            status: 'open',
            priority: 'NORMAL'
        });

        if (formalError) throw formalError;

        await supabase.from('internal_tickets').update({
            status: 'TRANSFERRED',
            is_transferred_to_envirojim: true
        }).eq('id', ticketId);

        return { success: true };
    } catch (e: any) {
        console.error('[transferToEnviroJim Error]', e);
        return { success: false, error: e.message };
    }
}
