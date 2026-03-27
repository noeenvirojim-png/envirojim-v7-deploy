'use server';

import { createClient } from '@/lib/supabase/server';
import { getCurrentUserFromSession } from '@/lib/auth-bridge';

export interface FleetAlert {
    id: string;
    machine_id?: string;
    machine_name?: string;
    risk_component: string;
    failure_mode: string;
    probability: number;
    recommended_action: string;
    risk_score: number;
}

export async function getFleetPredictiveAlerts(): Promise<{ success: boolean; alerts?: FleetAlert[]; error?: string }> {
    const user = await getCurrentUserFromSession();
    if (!user) return { success: false, error: 'Unauthorized' };

    const supabase = createClient();

    try {
        // 1. Fetch High Risk Failure Patterns from AI fleet analysis
        const { data: patterns, error: patternsError } = await supabase
            .from('fleet_failure_patterns')
            .select('*')
            .gt('risk_score', 0.4)
            .order('risk_score', { ascending: false });

        if (patternsError) throw patternsError;

        // 2. Map patterns to actual machines in the fleet
        // For EnviroJim V6, we join with machines that use those components
        const alerts: FleetAlert[] = [];

        for (const p of (patterns || [])) {
            // Find machines of relevant models
            const { data: machines } = await supabase
                .from('machines')
                .select('id, make, model, serial_number')
                .eq('owner_org_id', user.organization_id)
                .in('model', p.machine_models || []);

            if (machines) {
                for (const m of machines) {
                    alerts.push({
                        id: `${p.id}-${m.id}`,
                        machine_id: m.id,
                        machine_name: `${m.make} ${m.model} (SN: ${m.serial_number})`,
                        risk_component: p.component,
                        failure_mode: p.failure_mode,
                        probability: Math.round(p.risk_score * 100),
                        recommended_action: `Check ${p.component} for ${p.failure_mode}`,
                        risk_score: p.risk_score
                    });
                }
            }
        }

        return { success: true, alerts };

    } catch (e: any) {
        console.error('[getFleetPredictiveAlerts Error]', e);
        return { success: false, error: e.message };
    }
}
