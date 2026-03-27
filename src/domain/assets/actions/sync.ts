'use server';

import { submitInspection } from '@/domain/assets/actions/inspections';
import { createTicket } from '@/domain/support/actions/tickets';
import { createPartRequest } from '@/domain/procurement/actions/parts';
import { getCurrentUserFromSession } from '@/lib/auth-bridge';

export async function processOfflineQueueStatus(queueItems: any[]): Promise<{ results: any[] }> {
    const user = await getCurrentUserFromSession();
    if (!user) return { results: queueItems.map(i => ({ id: i.id, status: 'FAILED', error: 'Unauthorized' })) };

    const results = [];

    for (const item of queueItems) {
        try {
            let res;
            switch (item.type) {
                case 'INSPECTION':
                    res = await submitInspection(item.payload);
                    break;
                case 'TICKET':
                    res = await createTicket(item.payload);
                    break;
                case 'PART_REQUEST':
                    res = await createPartRequest(item.payload);
                    break;
                default:
                    res = { success: false, error: 'Unknown type' };
            }

            results.push({
                id: item.id,
                status: res?.success ? 'COMPLETED' : 'FAILED',
                error: res?.error
            });
        } catch (error: any) {
            results.push({
                id: item.id,
                status: 'FAILED',
                error: error.message
            });
        }
    }

    return { results };
}
