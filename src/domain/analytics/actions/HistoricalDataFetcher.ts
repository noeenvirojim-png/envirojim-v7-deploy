'use server';

import { createClient } from '@/lib/supabase/server';
import { getCurrentUserFromSession } from '@/lib/auth-bridge';

export async function fetchFullOperationalData() {
    const user = await getCurrentUserFromSession();
    if (!user) throw new Error('Unauthorized');
    const supabase = createClient();

    const [machines, maintenance, parts, transports] = await Promise.all([
        supabase.from('machines').select('*').eq('organization_id', user.organization_id),
        supabase.from('maintenance_rules').select('*, machine:machines(serial_number)').eq('organization_id', user.organization_id),
        supabase.from('part_orders').select('*, machine:machines(serial_number)').eq('organization_id', user.organization_id),
        supabase.from('transports').select('*, machine:machines(serial_number)').eq('organization_id', user.organization_id)
    ]);

    return {
        machines: machines.data || [],
        maintenance: maintenance.data || [],
        parts: parts.data || [],
        transports: transports.data || []
    };
}

export async function aggregateKpis() {
    const data = await fetchFullOperationalData();
    
    return {
        machine_count: data.machines.length,
        machines_down: data.maintenance.filter(m => m.alert_level === 'CRITICAL').length,
        maintenance_pending: data.maintenance.filter(m => m.is_active).length,
        parts_in_transit: data.parts.filter(p => p.internal_status === 'IN_TRANSIT').length,
        transports_delayed: data.transports.filter(t => t.status === 'DELAYED').length
    };
}
