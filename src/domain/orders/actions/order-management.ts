'use server';

import { createClient } from '@/lib/supabase/server';
import { getCurrentUserFromSession } from '@/lib/auth-bridge';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { revalidatePath } from 'next/cache';
import { 
    PartOrder, 
    InternalOrderStatus, 
    ClientOrderStatus 
} from '@/types/schema';
import { logAuditAction } from '@/domain/assets/actions/audit';

export async function createPartOrder(data: {
    machine_id?: string;
    serial_number?: string;
    internal_name?: string;
    description_fuzzy: string;
    quantity: number;
    destination_type: 'CLIENT' | 'STOCK';
    quote_pdf_url?: string;
}) {
    const user = await getCurrentUserFromSession();
    if (!user) throw new Error('Unauthorized');
    const supabase = createClient();

    let machineId = data.machine_id;

    if (!machineId && (data.serial_number || data.internal_name)) {
        const query = supabase.from('machines').select('id');
        if (data.serial_number) query.eq('serial_number', data.serial_number);
        else if (data.internal_name) query.eq('make', data.internal_name);
        
        const { data: machine } = await query.single();
        machineId = machine?.id;
    }

    const { data: order, error } = await supabase.from('part_orders').insert({
        organization_id: user.organization_id,
        machine_id: machineId,
        description_fuzzy: data.description_fuzzy,
        quantity: data.quantity,
        destination_type: data.destination_type,
        quote_pdf_url: data.quote_pdf_url,
        internal_status: 'REQUEST_ENTRY',
        client_status: 'REQUEST_INITIAL',
        email_sent: false
    }).select().single();

    if (error) throw error;

    await logAuditAction({
        machine_id: machineId || '',
        action_type: 'ORDER_CREATED',
        metadata: { order_id: order.id, description: data.description_fuzzy }
    });

    revalidatePath('/dashboard/orders');
    return { success: true, order };
}

export async function generateOrderEmail(orderId: string, type: 'SUPPLIER' | 'CLIENT' | 'BILLING') {
    const supabase = createClient();
    const { data: order } = await supabase.from('part_orders')
        .select('*, machine:machines(*)')
        .eq('id', orderId)
        .single();

    if (!order) throw new Error('Order not found');

    const machineInfo = `${order.machine?.make} ${order.machine?.model} (SN: ${order.machine?.serial_number})`;
    let subject = '';
    let body = '';
    let to = '';
    let cci = 'admin@envirojim.com, transport@envirojim.com';

    if (type === 'SUPPLIER') {
        to = 'parts@envirojim.com'; 
        subject = `[SUPPLIER ORDER] ${order.description_fuzzy} - ${order.machine?.serial_number}`;
        body = `Bonjour,\n\nTransmission de commande fournisseur :\n- Pièce: ${order.description_fuzzy}\n- Quantité: ${order.quantity}\n- Machine: ${machineInfo}\n- QB Quote: ${order.qb_quote_number || 'N/A'}\n- Dims/Poids: ${order.dimensions || 'N/A'} / ${order.weight || 'N/A'}\n\nMerci de traiter rapidement.\n\nCordialement,\nEnviroJim Team`;
    } else if (type === 'CLIENT') {
        to = 'client@customer.com';
        subject = `[DEVIS ENVIROJIM] Votre demande de pièces - ${order.machine?.serial_number}`;
        body = `Bonjour,\n\nVeuillez trouver ci-joint votre devis pour :\n- Pièce: ${order.description_fuzzy}\n- Machine: ${machineInfo}\n\nQB Quote Number: ${order.qb_quote_number || 'N/A'}\nLien PDF: ${order.quote_pdf_url || 'Consultable sur le portail'}\n\nMerci de nous confirmer votre approbation (PO).\n\nCordialement,\nL'équipe EnviroJim`;
    } else if (type === 'BILLING') {
        to = 'info@envirojim.com';
        subject = `[BILLING REQUIRED] Pièce livrée client - SN: ${order.machine?.serial_number}`;
        body = `NOTIFICATION RÉCEPTION CLIENT\n\nLe client a confirmé la réception finale.\n\nRÉSUMÉ POUR FACTURATION :\n- Devis QB: ${order.qb_quote_number || 'N/A'}\n- Facture #: ${order.invoice_number || 'N/A'}\n- Pièce: ${order.description_fuzzy}\n- Machine: ${machineInfo}\n- Coût Transport: ${order.transport_cost || 'N/A'}\n\nAction requise: Finaliser facturation QuickBooks.`;
    }

    const mailto = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}&bcc=${encodeURIComponent(cci)}`;

    return { success: true, mailto };
}
