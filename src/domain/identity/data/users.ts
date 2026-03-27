import { createClient } from '@/lib/supabase/server';
import { dbMapper } from '@/lib/db-mapper';
import { User, Organization, UserRole } from '@/types/schema';

/**
 * Identity Domain Service: Users
 */
export const UsersService = {
    /**
     * Get user by ID 
     */
    async getUserById(id: string) {
        const supabase = createClient();
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', id)
            .is('deleted_at', null)
            .single();

        if (error) throw error;
        return dbMapper.mapUser(data);
    },

    /**
     * Get current user profile (using session ID)
     */
    async getCurrentProfile() {
        // Use simpler ID fetch
        const { getCurrentUserId } = await import('@/lib/auth-bridge');
        const userId = await getCurrentUserId();
        if (!userId) return null;

        return this.getUserById(userId);
    },

    /**
     * Update user profile
     */
    async updateProfile(id: string, profileData: Partial<User>) {
        const supabase = createClient();
        const { data, error } = await supabase
            .from('users')
            .update({
                full_name: profileData.full_name,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return dbMapper.mapUser(data);
    },

    /**
     * Get count of active technicians
     */
    async getTechnicianCount() {
        const supabase = createClient();
        const { count, error } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true })
            .eq('role', 'TECHNICIAN')
            .is('deleted_at', null);

        if (error) throw error;
        return count || 0;
    },

    /**
     * Get all technicans with organization data
     */
    async getTechnicians() {
        const supabase = createClient();
        const { data, error } = await supabase
            .from('users')
            .select(`
                *,
                organization:organizations(*)
            `)
            .eq('role', 'TECHNICIAN')
            .is('deleted_at', null)
            .order('full_name');

        if (error) throw error;
        return data.map((row: any) => ({
            ...dbMapper.mapUser(row),
            organization: row.organization ? dbMapper.mapOrganization(row.organization) : null
        }));
    },

    /**
     * Get all users with organization data
     */
    async getAllUsers() {
        const supabase = createClient();
        const { data, error } = await supabase
            .from('users')
            .select(`
                *,
                organization:organizations(*)
            `)
            .is('deleted_at', null)
            .order('full_name');

        if (error) throw error;
        return data.map((row: any) => ({
            ...dbMapper.mapUser(row),
            organization: row.organization ? dbMapper.mapOrganization(row.organization) : null
        }));
    },

    /**
     * Update user role
     */
    async updateUserRole(id: string, role: UserRole) {
        const supabase = createClient();
        const { data, error } = await supabase
            .from('users')
            .update({
                role,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return dbMapper.mapUser(data);
    },

    /**
     * Get all client organizations
     */
    async getClients() {
        const supabase = createClient();
        const { data, error } = await supabase
            .from('organizations')
            .select('*')
            .eq('type', 'CLIENT')
            .is('deleted_at', null)
            .order('name');

        if (error) throw error;
        return data.map(dbMapper.mapOrganization);
    }
};
