import { createClient } from '@/lib/supabase/server';
import { dbMapper } from '@/lib/db-mapper';
import { PartRequest, Rfq } from '@/types/schema';

/**
 * Procurement Domain Service: Part Requests & RFQs
 */
export const ProcurementService = {
    /**
     * Fetch all part requests
     */
    async getPartRequests() {
        const supabase = createClient();
        const { data, error } = await supabase
            .from('part_requests')
            .select('*, items:part_request_items(*)')
            .is('deleted_at', null)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data.map(dbMapper.mapPartRequest);
    },

    /**
     * Get pending RFQ count for dashboard
     */
    async getPendingRfqCount() {
        const supabase = createClient();
        const { count, error } = await supabase
            .from('rfqs')
            .select('*', { count: 'exact', head: true })
            .in('status', ['DRAFT', 'SENT']);

        if (error) throw error;
        return count || 0;
    },

    /**
     * Create a part request with items using RPC
     */
    async createPartRequest(requestData: any, items: any[]) {
        const supabase = createClient();
        const { data, error } = await supabase.rpc('create_part_request_with_items', {
            p_request_data: requestData,
            p_items_data: items
        });

        if (error) throw error;
        return data;
    },

    /**
     * Get all parts from the catalog
     */
    async getPartsCatalog() {
        const supabase = createClient();
        const { data, error } = await supabase
            .from('parts_catalog')
            .select('*')
            .order('name');

        if (error) throw error;
        return data.map((dbMapper as any).mapPartCatalogItem);
    },

    /**
     * Update RFQ status
     */
    async updateRfqStatus(id: string, status: string) {
        const supabase = createClient();
        const { data, error } = await supabase
            .from('rfqs')
            .update({ status })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return (dbMapper as any).mapRfq(data);
    }
};
