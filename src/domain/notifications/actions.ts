'use server';

import { createClient } from '@/lib/supabase/server';
import { getCurrentUserFromSession } from '@/lib/auth-bridge';

interface NotificationPayload {
    userId: string;
    title: string;
    message: string;
    type: 'TICKET_ASSIGNED' | 'PART_APPROVED' | 'QUOTE_READY' | 'ORDER_SHIPPED' | 'ALERT';
    linkUrl?: string;
}

/**
 * Route a notification directly to the user's in-app inbox 
 * and fallback to email via an external provider (mocked for now)
 */
export async function sendNotification(payload: NotificationPayload) {
    const supabase = createClient();

    // 1. Insert In-App Notification
    const { error } = await supabase
        .from('notifications') // Assuming this table exists, or will be created
        .insert({
            user_id: payload.userId,
            title: payload.title,
            message: payload.message,
            type: payload.type,
            link_url: payload.linkUrl,
            is_read: false
        });

    if (error) {
        console.error('Failed to create in-app notification:', error);
    }

    // 2. Dispatch Email (MOCKED)
    console.log(`[EMAIL DISPATCH] Sending to user ${payload.userId}: [${payload.title}] ${payload.message}`);

    return { success: !error };
}

/**
 * Triggered typically by the generic Audit Trigger webhook, but for V6 
 * we also call this explicitly during mutations if the trigger webhook isn't configured in Supabase.
 */
export async function notifyDispatchOnNewTicket(ticketId: string, machineId: string) {
    // Logic to find all Dispatchers in the Org and notify them
    const supabase = createClient();
    const user = await getCurrentUserFromSession();
    if (!user) return;

    const { data: dispatchers } = await supabase
        .from('users')
        .select('id')
        .eq('organization_id', user.organization_id)
        .eq('role', 'DISPATCHER');

    if (dispatchers) {
        for (const dispatcher of dispatchers) {
            await sendNotification({
                userId: dispatcher.id,
                title: 'Nouveau Ticket d\'Intervention',
                message: `Une anomalie technique a été signalée sur la machine ${machineId}.`,
                type: 'ALERT',
                linkUrl: `/dashboard/tickets/${ticketId}`
            });
        }
    }
}
