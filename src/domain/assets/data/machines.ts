import { createClient } from '@/lib/supabase/server';
import { dbMapper } from '@/lib/db-mapper';
import { Machine } from '@/types/schema';

/**
 * Assets Domain Service: Machines
 */
export const MachinesService = {
    /**
     * Fetch all machines with advanced sorting, filtering, and pagination
     */
    async getMachines(params?: {
        search?: string;
        make?: string;
        city?: string;
        year?: string;
        sort?: string;
        dir?: 'asc' | 'desc';
        page?: string;
    }) {
        const supabase = createClient();

        let query = supabase
            .from('machines')
            .select(`
                *,
                organization:organizations!owner_org_id ( name )
            `, { count: 'exact' })
            .is('deleted_at', null);

        // Filtering
        if (params?.search) {
            query = query.or(`serial_number.ilike.%${params.search}%,model.ilike.%${params.search}%,make.ilike.%${params.search}%`);
        }
        if (params?.make) query = query.ilike('make', `%${params.make}%`);
        if (params?.city) query = query.ilike('city', `%${params.city}%`);
        if (params?.year) query = query.eq('year', params.year);

        // Sorting
        const isAscending = params?.dir !== 'desc';
        if (params?.sort === 'Client') {
            // Cannot order by nested Many-to-1 natively via standard select, default to updated_at
            query = query.order('updated_at', { ascending: isAscending });
        } else if (params?.sort === 'City') {
            query = query.order('city', { ascending: isAscending });
        } else if (params?.sort === 'Make') {
            query = query.order('make', { ascending: isAscending });
        } else if (params?.sort === 'Model') {
            query = query.order('model', { ascending: isAscending });
        } else if (params?.sort === 'Serial Number') {
            query = query.order('serial_number', { ascending: isAscending });
        } else if (params?.sort === 'Year') {
            query = query.order('year', { ascending: isAscending });
        } else if (params?.sort === 'Current Hours') {
            query = query.order('current_hours', { ascending: isAscending });
        } else if (params?.sort === 'Last Updated') {
            query = query.order('updated_at', { ascending: isAscending });
        } else {
            query = query.order('created_at', { ascending: false });
        }

        // Pagination
        const itemsPerPage = 50;
        const page = params?.page ? parseInt(params.page) : 1;
        const from = (page - 1) * itemsPerPage;
        const to = from + itemsPerPage - 1;

        query = query.range(from, to);

        const { data, count, error } = await query;
        if (error) throw error;

        // AUTH STABILISATION: Resilient mapping to avoid 500 Digest crashes
        const mapped = (data || []).map((row: any) => {
            try {
                return dbMapper.mapMachine(row);
            } catch (mapErr) {
                console.warn(`[MAPPER_FAIL] Skipping corrupt machine row: ${row.id}`, mapErr);
                return null;
            }
        }).filter(Boolean);

        // Handle in-memory sorting for Client fallback if requested
        if (params?.sort === 'Client' && data.length > 0) {
            mapped.sort((a: any, b: any) => {
                const aName = a.organization?.name || '';
                const bName = b.organization?.name || '';
                return isAscending ? aName.localeCompare(bName) : bName.localeCompare(aName);
            });
        }

        return {
            machines: mapped,
            totalCount: count || 0,
            totalPages: Math.ceil((count || 0) / itemsPerPage)
        };
    },

    /**
     * Get a single machine by ID with nested checklists
     */
    async getMachineById(id: string) {
        const supabase = createClient();
        const { data, error } = await supabase
            .from('machines')
            .select(`
                *,
                checklists:checklists(*),
                documents:documents(*),
                interventions:interventions(*)
            `)
            .eq('id', id)
            .is('deleted_at', null)
            .order('created_at', { foreignTable: 'checklists', ascending: false })
            .limit(20, { foreignTable: 'checklists' })
            .single();

        if (error) throw error;
        if (!data) return null;

        try {
            return dbMapper.mapMachine(data);
        } catch (mapErr) {
            console.error(`[MACHINES_SERVICE] Failed to map machine ${id}:`, mapErr);
            // V6 Hardening: Return a sanitized corrupt object instead of crashing UI
            return {
                id: data.id,
                serialNumber: data.serial_number || 'UNKNOWN',
                organizationId: data.owner_org_id || data.organization_id || '00000000-0000-0000-0000-000000000000',
                make: data.make || 'Unknown',
                model: data.model || 'Model X',
                isCorrupt: true
            } as any;
        }
    },

    /**
     * Create a machine using the zero-trust RPC
     */
    async createMachine(machineData: any, documentData?: any) {
        const supabase = createClient();
        const { data, error } = await supabase.rpc('create_machine_with_document', {
            p_machine_data: machineData,
            p_document_data: documentData || null
        });

        if (error) throw error;
        return data;
    }
};
