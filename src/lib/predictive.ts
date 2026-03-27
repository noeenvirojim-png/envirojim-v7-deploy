import { Machine } from '@/types/schema';
import { createClient } from '@/lib/supabase/server';

/**
 * Predictive Maintenance Engine
 * "The Moneymaker" Module
 */

export async function checkMaintenanceTriggers(machineId: string) {
    const supabase = createClient();

    // 1. Get Machine Hours and Manual Schedule
    const { data: machine, error } = await supabase
        .from('machines')
        .select('*')
        .eq('id', machineId)
        .single();

    if (error || !machine) {
        return { alert: false, error: 'Machine not found' };
    }

    // Mocking the AI-extracted schedule which would populate from 'documents'
    const schedule = {
        interval_hours: 500,
        required_parts: ['Oil Filter X', 'Fuel Filter Y']
    };

    // 2. Check Threshold (e.g. within 50 hours)
    const nextService = Math.ceil(machine.current_hours / schedule.interval_hours) * schedule.interval_hours;
    const hoursUntilService = nextService - machine.current_hours;

    if (hoursUntilService <= 50) {
        // 3. Trigger Alert
        return {
            alert: true,
            message: `${hoursUntilService} hours until ${nextService}h Service.`,
            suggested_parts: schedule.required_parts,
            auto_draft_quote: true // Flag to create the Draft Request
        };
    }

    return { alert: false };
}
