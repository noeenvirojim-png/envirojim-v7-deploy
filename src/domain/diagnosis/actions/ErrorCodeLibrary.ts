'use server';

import { createClient } from '@/lib/supabase/server';

/**
 * ErrorCodeLibrary
 * Provides access to the master repository of CAT, Volvo, and Cummins error codes.
 */
export async function getErrorCodeInfo(manufacturer: string, code: string) {
    const supabase = createClient();
    
    const { data, error } = await supabase
        .from('error_codes')
        .select('*')
        .eq('manufacturer', manufacturer.toUpperCase())
        .ilike('code', `%${code}%`)
        .maybeSingle();

    if (error) {
        console.error('[ErrorCodeLibrary Error]', error);
        return null;
    }

    return data;
}

/**
 * Seed basic codes for documentation and initial test (Stub data)
 */
export async function seedInitialCodes() {
    const supabase = createClient();
    
    const basicCodes = [
        { manufacturer: 'CATERPILLAR', code: 'E324', description: 'High Coolant Temperature', recommended_checks: ['Check coolant level', 'Inspect radiator', 'Verify fan operation'] },
        { manufacturer: 'CUMMINS', code: 'SPN 523602 FMI 7', description: 'Turbocharger Speed Low', recommended_checks: ['Check air intake', 'Inspect turbocharger vanes', 'Check for boost leaks'] },
        { manufacturer: 'VOLVO_PENTA', code: 'MID 128 PID 94 FMI 7', description: 'Fuel Delivery Pressure Low', recommended_checks: ['Replace fuel filters', 'Check fuel lines', 'Verify fuel pump pressure'] }
    ];

    const { error } = await supabase.from('error_codes').upsert(basicCodes, { onConflict: 'manufacturer,code' });
    return { success: !error, error };
}
