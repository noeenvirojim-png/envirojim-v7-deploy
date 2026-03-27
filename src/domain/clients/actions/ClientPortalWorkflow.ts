'use server';

import { createClient } from '@/lib/supabase/server';
import { getCurrentUserFromSession } from '@/lib/auth-bridge';
import { sendClientEmail, pushClientNotification } from './ClientNotificationEngine';

export async function getClientPortalData() {
    const user = await getCurrentUserFromSession();
    if (!user) throw new Error('Unauthorized');
    const supabase = createClient();

    // Fetch PartOrders as the basis for Client Portal data
    const { data: orders, error } = await supabase
        .from('part_orders')
        .select(`
            *,
            machine:machines(serial_number, make, model)
        `)
        .eq('organization_id', user.organization_id)
        .order('created_at', { ascending: false });

    if (error) throw error;

    // Map to the format expected by the UI stub
    return orders.map(order => ({
        id: order.id,
        client: order.machine?.serial_number || 'Stock',
        commande: order.description_fuzzy,
        devis: order.qb_quote_number || 'TBD',
        facture: order.invoice_number || 'TBD',
        paiement: order.client_status === 'PO_CONFIRMED' ? 'Payé' : 'En attente',
        livraison: order.final_delivery_date ? `Prévue ${new Date(order.final_delivery_date).toLocaleDateString()}` : 'TBD'
    }));
}

export async function triggerClientWorkflow(row: any) {
    await sendClientEmail(row);
    await pushClientNotification(row);
}
