import { createClient } from '@/lib/supabase/server';
import { dbMapper } from '@/lib/db-mapper';
import { Organization } from '@/types/schema';

/**
 * Identity Domain Service: Organizations (Clients & Dealers)
 */
export const OrganizationsService = {
    /**
     * Fetch organizations by type
     */
    async getOrganizations(type: 'CLIENT' | 'DEALER' | 'ADMIN') {
        const supabase = createClient();
        const { data, error } = await supabase
            .from('organizations')
            .select('*')
            .eq('type', type)
            .is('deleted_at', null)
            .order('name');

        if (error) throw error;
        return data.map(dbMapper.mapOrganization);
    },

    /**
     * Get organization by ID
     */
    async getOrganizationById(id: string) {
        const supabase = createClient();
        const { data, error } = await supabase
            .from('organizations')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        return dbMapper.mapOrganization(data);
    },

    /**
     * Create organization
     */
    async createOrganization(orgData: Partial<Organization>) {
        const supabase = createClient();
        const { data, error } = await supabase
            .from('organizations')
            .insert(orgData)
            .select()
            .single();

        if (error) throw error;
        return dbMapper.mapOrganization(data);
    },

    /**
     * Update organization
     */
    async updateOrganization(id: string, updates: Partial<Organization>) {
        const supabase = createClient();
        const { data, error } = await supabase
            .from('organizations')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return dbMapper.mapOrganization(data);
    },

    /**
     * Soft delete organization
     */
    async deleteOrganization(id: string) {
        const supabase = createClient();
        const { error } = await supabase
            .from('organizations')
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', id);

        if (error) throw error;
        return true;
    }
};
