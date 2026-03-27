import { createClient } from '@/lib/supabase/server';
import { dbMapper } from '@/lib/db-mapper';
import { Intervention, MaintenanceRule } from '@/types/schema';

/**
 * Maintenance Domain Service: Interventions & Scheduling
 */
export const MaintenanceService = {
    /**
     * Fetch all interventions
     */
    async getInterventions() {
        const supabase = createClient();
        const { data, error } = await supabase
            .from('interventions')
            .select(`
                *,
                machine:machines(*),
                technician:users!technician_user_id(*),
                parts:intervention_parts(
                    *,
                    part:parts_catalog(*)
                )
            `)
            .is('deleted_at', null)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data.map((dbMapper as any).mapIntervention);
    },

    /**
     * Get maintenance rules for a machine
     */
    async getRulesByMachine(machineId: string) {
        const supabase = createClient();
        const { data, error } = await supabase
            .from('maintenance_rules')
            .select('*')
            .eq('machine_id', machineId)
            .is('deleted_at', null);

        if (error) throw error;
        return data.map(dbMapper.mapMaintenanceRule);
    },

    /**
     * Log a new intervention
     */
    async logIntervention(interventionData: Partial<Intervention>) {
        const supabase = createClient();
        const { data, error } = await supabase
            .from('interventions')
            .insert({
                ...interventionData,
                is_completed: interventionData.is_completed ?? false
            })
            .select()
            .single();

        if (error) throw error;
        return dbMapper.mapIntervention(data);
    }
};
