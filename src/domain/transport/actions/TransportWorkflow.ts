'use server';

import { createClient } from '@/lib/supabase/server';
import { getCurrentUserFromSession } from '@/lib/auth-bridge';
import { revalidatePath } from 'next/cache';
import { Transport, TransportStatus } from '@/types/schema';
import { logAuditAction } from '@/domain/assets/actions/audit';
import { transportAIMapper } from './TransportAIMapper';
import { sendMailToTransporteur, pushNotification } from './TransportNotificationEngine';

export async function createTransport(data: Partial<Transport>) {
    const user = await getCurrentUserFromSession();
    if (!user) throw new Error('Unauthorized');
    const supabase = createClient();

    const { data: transport, error } = await supabase
        .from('transports')
        .insert({
            ...data,
            organization_id: user.organization_id,
            status: 'PENDING'
        })
        .select()
        .single();

    if (error) throw error;

    await logAuditAction({
        machine_id: data.machine_id || '',
        action_type: 'TRANSPORT_CREATED',
        metadata: { transport_id: transport.id, transporter: data.transporter_name }
    });

    revalidatePath('/dashboard/transport');
    return { success: true, transport };
}

export async function updateTransportStatus(id: string, status: TransportStatus, notes?: string) {
    const user = await getCurrentUserFromSession();
    if (!user) throw new Error('Unauthorized');
    const supabase = createClient();

    const { data: transport, error } = await supabase
        .from('transports')
        .update({ status, internal_notes: notes })
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;

    // Trigger automated notifications based on status
    if (status === 'DELAYED') {
        await sendTransportAlert(transport);
    } else if (status === 'DELIVERED') {
        await triggerDeliveryFinalization(transport);
    }

    await logAuditAction({
        machine_id: transport.machine_id || '',
        action_type: 'TRANSPORT_STATUS_UPDATED',
        metadata: { transport_id: id, status, notes }
    });

    revalidatePath('/dashboard/transport');
    return { success: true, transport };
}

async function sendTransportAlert(transport: any) {
    // Automated internal mailto generation placeholder
    const subject = `[RETARD TRANSPORT] Reference: ${transport.carrier_reference}`;
    const body = `Attention,\n\nLe transport ${transport.transporter_name} est marqué comme RETARDÉ.\nDate prévue: ${transport.delivery_date_est}\nLien: /dashboard/transport/${transport.id}`;
    // In production, this would trigger an actual email service
    console.log('Transport Alert Sent:', { subject, body });
}

async function triggerDeliveryFinalization(transport: any) {
    // Logic to update linked machine/order status
    const supabase = createClient();
    if (transport.machine_id) {
        await supabase.from('machines').update({ transport_type: 'DELIVERED' }).eq('id', transport.machine_id);
    }
}

export async function getTransportListing() {
    const supabase = createClient();
    const { data } = await supabase
        .from('transports')
        .select(`
            *,
            machine:machines(serial_number, make, model)
        `)
        .order('created_at', { ascending: false });
    return data || [];
}

export async function triggerTransportWorkflow(transportId: string) {
    const user = await getCurrentUserFromSession();
    if (!user) throw new Error('Unauthorized');
    const supabase = createClient();

    const { data: transport, error } = await supabase
        .from('transports')
        .select(`*, machine:machines(*)`)
        .eq('id', transportId)
        .single();

    if (error || !transport) throw new Error('Transport not found');

    const mapped = await transportAIMapper(transport);
    const mailto = await sendMailToTransporteur(mapped);
    await pushNotification(mapped);

    return { success: true, mailto };
}
