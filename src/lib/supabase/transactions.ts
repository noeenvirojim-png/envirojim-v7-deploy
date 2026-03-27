/**
 * RLS-Safe Transaction Wrapper
 * 
 * Provides atomic multi-step operations using PostgreSQL functions
 * while maintaining Row Level Security (RLS) enforcement.
 * 
 * Unlike admin-db.ts which bypasses RLS, these functions use
 * Supabase RPC to call SECURITY DEFINER database functions that
 * respect RLS policies.
 */

import { createClient } from '@/lib/supabase/server';
import { logInfo, logError } from '@/lib/logger';

/**
 * Create a machine with optional document in a single atomic transaction
 * 
 * @param machineData - Machine creation data
 * @param documentData - Optional document data
 * @returns Result with machine_id and optional document_id
 */
export async function createMachineWithDocument(
    machineData: {
        organization_id: string;
        assigned_partner_id?: string;
        serial_number: string;
        make: string;
        model: string;
        year: number;
        country?: string;
        state_province?: string;
        city?: string;
        site_name?: string;
        site_id?: string;
        current_hours?: number;
        engine_make?: string;
        engine_serial?: string;
    },
    documentData?: {
        title: string;
        file_url: string;
        file_type: string;
        file_size_bytes: number;
        uploaded_by: string;
    }
): Promise<{ machine_id: string; document_id?: string }> {
    const supabase = createClient();

    try {
        const { data, error } = await supabase.rpc('create_machine_with_document', {
            p_machine_data: machineData,
            p_document_data: documentData || null,
        });

        if (error) {
            logError('error.database', error, {
                operation: 'create_machine_with_document',
                machineData,
            });
            throw error;
        }

        logInfo('machine.created', {
            machineId: data.machine_id,
            documentId: data.document_id,
        });

        return data;
    } catch (error) {
        console.error('Transaction failed:', error);
        throw error;
    }
}

/**
 * Create a part request with items in a single atomic transaction
 * 
 * @param requestData - Part request data
 * @param items - Array of part request items
 * @returns Result with request_id and item_count
 */
export async function createPartRequestWithItems(
    requestData: {
        machine_id: string;
        requester_user_id: string;
        status?: string;
        urgency?: string;
        client_po_number?: string;
    },
    items: Array<{
        partId: string;
        quantity: number;
        margin_percent?: number;
    }>
): Promise<{ request_id: string; item_count: number }> {
    const supabase = createClient();

    try {
        const { data, error } = await supabase.rpc('create_part_request_with_items', {
            p_request_data: requestData,
            p_items: items,
        });

        if (error) {
            logError('error.database', error, {
                operation: 'create_part_request_with_items',
                requestData,
                itemCount: items.length,
            });
            throw error;
        }

        logInfo('part_request.created', {
            requestId: data.request_id,
            itemCount: data.item_count,
        });

        return data;
    } catch (error) {
        console.error('Transaction failed:', error);
        throw error;
    }
}

/**
 * Update part request status with validation
 * 
 * @param requestId - Part request ID
 * @param newStatus - New status
 * @param userId - User making the change
 * @returns Result with old and new status
 */
export async function updatePartRequestStatusAtomic(
    requestId: string,
    newStatus: string,
    userId: string
): Promise<{ request_id: string; old_status: string; new_status: string }> {
    const supabase = createClient();

    try {
        const { data, error } = await supabase.rpc('update_part_request_status', {
            p_request_id: requestId,
            p_new_status: newStatus,
            p_user_id: userId,
        });

        if (error) {
            logError('error.database', error, {
                operation: 'update_part_request_status',
                requestId,
                newStatus,
            });
            throw error;
        }

        logInfo('part_request.status_changed', {
            requestId: data.request_id,
            oldStatus: data.old_status,
            newStatus: data.new_status,
            userId,
        });

        return data;
    } catch (error) {
        console.error('Transaction failed:', error);
        throw error;
    }
}
