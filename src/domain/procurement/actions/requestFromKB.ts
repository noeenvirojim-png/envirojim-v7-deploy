'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentUserFromSession } from '@/lib/auth-bridge'
import { revalidatePath } from 'next/cache'

/**
 * Bridge action: creates a part_order + part_order_item from a KB entity.
 * Used when a user sees a part in the Knowledge Base and wants to request it.
 */
export async function requestPartFromKB(params: {
    machineId: string
    partNumber: string
    partName: string
    quantity?: number
    urgency?: 'low' | 'normal' | 'high' | 'critical'
    notes?: string
}): Promise<{ success: boolean; orderId?: string; error?: string }> {
    const user = await getCurrentUserFromSession()
    if (!user) return { success: false, error: 'Unauthorized' }

    const supabase = createClient()

    // Create part_order with machine context
    const { data: order, error: orderErr } = await supabase
        .from('part_orders')
        .insert({
            organization_id: user.organization_id,
            machine_id: params.machineId,
            created_by: user.id,
            status: 'draft',
            notes: params.notes || `Part request from machine intelligence: ${params.partName} (${params.partNumber})`,
        })
        .select('id')
        .single()

    if (orderErr || !order) {
        return { success: false, error: orderErr?.message || 'Failed to create order' }
    }

    // Create line item
    const { error: itemErr } = await supabase
        .from('part_order_items')
        .insert({
            part_order_id: order.id,
            part_number: params.partNumber,
            description: params.partName,
            quantity: params.quantity ?? 1,
            urgency: params.urgency ?? 'normal',
        })

    if (itemErr) {
        return { success: false, error: itemErr.message }
    }

    revalidatePath('/dashboard/procurement')
    revalidatePath('/dashboard/orders')

    return { success: true, orderId: order.id }
}

/**
 * Bridge action: creates a part_order with multiple items from KB entities.
 * Used for batch procurement from the machine parts list.
 */
export async function requestMultiplePartsFromKB(params: {
    machineId: string
    items: Array<{
        partNumber: string
        partName: string
        quantity?: number
        urgency?: 'low' | 'normal' | 'high' | 'critical'
    }>
    notes?: string
}): Promise<{ success: boolean; orderId?: string; error?: string }> {
    const user = await getCurrentUserFromSession()
    if (!user) return { success: false, error: 'Unauthorized' }
    if (params.items.length === 0) return { success: false, error: 'No items provided' }

    const supabase = createClient()

    const { data: order, error: orderErr } = await supabase
        .from('part_orders')
        .insert({
            organization_id: user.organization_id,
            machine_id: params.machineId,
            created_by: user.id,
            status: 'draft',
            notes: params.notes || `Batch request from machine KB — ${params.items.length} item(s)`,
        })
        .select('id')
        .single()

    if (orderErr || !order) {
        return { success: false, error: orderErr?.message || 'Failed to create order' }
    }

    const orderItems = params.items.map(item => ({
        part_order_id: order.id,
        part_number: item.partNumber,
        description: item.partName,
        quantity: item.quantity ?? 1,
        urgency: item.urgency ?? 'normal',
    }))

    const { error: itemsErr } = await supabase.from('part_order_items').insert(orderItems)
    if (itemsErr) {
        return { success: false, error: itemsErr.message }
    }

    revalidatePath('/dashboard/procurement')
    revalidatePath('/dashboard/orders')

    return { success: true, orderId: order.id }
}
