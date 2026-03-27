'use server';

import { createClient } from '@/lib/supabase/server';
import { getCurrentUserFromSession } from '@/lib/auth-bridge';
import { normalizeSerialNumber } from '@/lib/normalization';

/**
 * Resolves a Machine Serial Number to its UUID.
 * strictly enforces Tenant RLS.
 */
export async function resolveMachineBySerialNumber(serialNumber: string): Promise<{ success: boolean; id?: string; error?: string }> {
    const supabase = createClient();
    const user = await getCurrentUserFromSession();

    if (!user) {
        return { success: false, error: 'Unauthorized' };
    }

    const normalizedSN = normalizeSerialNumber(serialNumber);

    try {
        let { data, error } = await supabase
            .from('machines')
            .select('id')
            .eq('serial_number', normalizedSN)
            .is('deleted_at', null)
            .single();

        // FAILSAFE: Try case-insensitive if exact match fails
        if (!data) {
            const { data: fuzzyData } = await supabase
                .from('machines')
                .select('id')
                .ilike('serial_number', normalizedSN)
                .is('deleted_at', null)
                .single();
            data = fuzzyData;
        }

        if (!data) {
            console.error('[Resolver Error] Machine not found for SN:', normalizedSN);
            return { success: false, error: 'Machine introuvable' };
        }

        return { success: true, id: data.id };
    } catch (e) {
        console.error('[Resolver Fatal]', e);
        return { success: false, error: 'Database error' };
    }
}
