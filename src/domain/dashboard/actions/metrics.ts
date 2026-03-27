import { createClient } from '@/lib/supabase/server';
import { getCurrentUserFromSession } from '@/lib/auth-bridge';
import { DashboardMetrics } from '@/types/dashboard';

export type { DashboardMetrics };

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
    const supabase = createClient();
    let user = null;
    
    try {
        user = await getCurrentUserFromSession();
    } catch (authErr: any) {
        // Silent fail for Zero-Crash policy
    }

    if (!user) {
        return getSafeMetrics();
    }

    const metrics: DashboardMetrics = getSafeMetrics();

    try {
        // 1. Fetch active machines
        const { count: machineCount } = await supabase
            .from('machines')
            .select('*', { count: 'exact', head: true })
            .is('deleted_at', null);
        metrics.activeMachines = machineCount || 0;

        // 2. Fetch open tickets
        const { count: ticketCount } = await supabase
            .from('tickets')
            .select('*', { count: 'exact', head: true })
            .in('status', ['OPEN', 'IN_PROGRESS'])
            .is('deleted_at', null);
        metrics.openTickets = ticketCount || 0;

        // 3. Fetch critical tickets for alerts
        const { count: criticalCount } = await supabase
            .from('tickets')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'OPEN')
            .eq('priority', 'CRITICAL')
            .is('deleted_at', null);
        metrics.alerts.criticalTickets = criticalCount || 0;

        // 4. Fetch pending interventions (Work Orders)
        const { count: interventionCount } = await supabase
            .from('interventions')
            .select('*', { count: 'exact', head: true })
            .eq('is_completed', false)
            .is('deleted_at', null);
        metrics.pendingWorkOrders = interventionCount || 0;

        // 5. Fetch part requests awaiting approval
        const { count: PRCount } = await supabase
            .from('part_requests')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'DRAFT')
            .is('deleted_at', null);
        metrics.partsAwaitingApproval = PRCount || 0;

        // 6. Overdue maintenance
        const { count: overdueCount } = await supabase
            .from('maintenance_rules')
            .select('*', { count: 'exact', head: true })
            .eq('is_active', true)
            .lte('next_due_at', new Date().toISOString())
            .is('deleted_at', null);
        metrics.alerts.overdueMaintenance = overdueCount || 0;

        // 7. SaaS Entities: Clients
        const { count: clientCount } = await supabase
            .from('organizations')
            .select('*', { count: 'exact', head: true })
            .eq('is_active', true)
            .is('deleted_at', null);
        metrics.clientCount = clientCount || 0;

        // 8. SaaS Entities: Dealers
        const { count: dealerCount } = await supabase
            .from('organizations')
            .select('*', { count: 'exact', head: true })
            .eq('type', 'DEALER')
            .is('deleted_at', null);
        metrics.dealerCount = dealerCount || 0;

        // 9. SaaS Entities: Inventory
        const { count: invCount } = await supabase
            .from('parts')
            .select('*', { count: 'exact', head: true })
            .is('deleted_at', null);
        metrics.inventoryCount = invCount || 0;

    } catch (globalErr: any) {
        // Zero-Crash: Fallback to blank metrics
    }

    return metrics;
}

/**
 * Returns a guaranteed valid metrics structure with zeroed values.
 */
function getSafeMetrics(): DashboardMetrics {
    return {
        activeMachines: 0,
        openTickets: 0,
        pendingWorkOrders: 0,
        partsAwaitingApproval: 0,
        clientCount: 0,
        dealerCount: 0,
        inventoryCount: 0,
        alerts: {
            criticalTickets: 0,
            machineWarnings: 0,
            overdueMaintenance: 0
        }
    };
}
