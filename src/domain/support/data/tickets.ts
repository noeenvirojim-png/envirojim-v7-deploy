import { createClient } from '@/lib/supabase/server';
import { dbMapper } from '@/lib/db-mapper';
import { Ticket } from '@/types/schema';

/**
 * Support Domain Service: Tickets
 */
export const TicketsService = {
    /**
     * Fetch all tickets with machine and creator details
     */
    async getTickets() {
        const supabase = createClient();
        const { data, error } = await supabase
            .from('tickets')
            .select(`
                *,
                machine:machine_id (make, model, serial_number),
                creator:created_by (full_name)
            `)
            .is('deleted_at', null)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data.map(dbMapper.mapTicket);
    },

    /**
     * Get a single ticket by ID with full details
     */
    async getTicketById(id: string) {
        const supabase = createClient();
        const { data, error } = await supabase
            .from('tickets')
            .select(`
                *,
                machine:machine_id (make, model, serial_number),
                creator:created_by (full_name),
                assignee:assigned_to (full_name)
            `)
            .eq('id', id)
            .single();

        if (error) throw error;
        return dbMapper.mapTicket(data);
    },

    /**
     * Create a new ticket
     */
    async createTicket(ticketData: Partial<Ticket>) {
        const supabase = createClient();
        const { data, error } = await supabase
            .from('tickets')
            .insert(ticketData)
            .select()
            .single();

        if (error) throw error;
        return dbMapper.mapTicket(data);
    },

    /**
     * Update ticket properties
     */
    async updateTicket(id: string, updates: Partial<Ticket>) {
        const supabase = createClient();
        const { data, error } = await supabase
            .from('tickets')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return dbMapper.mapTicket(data);
    },

    /**
     * Assign ticket to a user
     */
    async assignTicket(id: string, userId: string | null) {
        return this.updateTicket(id, { assigned_to: userId } as any);
    },

    /**
     * Soft delete a ticket
     */
    async deleteTicket(id: string) {
        const supabase = createClient();
        const { error } = await supabase
            .from('tickets')
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', id);

        if (error) throw error;
        return true;
    }
};
