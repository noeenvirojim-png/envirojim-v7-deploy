'use server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserFromSession } from '@/lib/auth-bridge'
import { revalidatePath } from 'next/cache'

export async function getPartOrders() {
  const user = await getCurrentUserFromSession()
  if (!user) return []
  const supabase = createClient()

  // V9 Schema: Join on items, currency default CAD (SQL V9 line 321)
  const { data } = await supabase
    .from('part_orders')
    .select('*, items:part_order_items(*)')
    .eq('organization_id', user.organization_id)
    .order('created_at', { ascending: false })

  return data ?? []
}

export async function createPartOrderV9(data: {
  machineId?: string
  items: { partId?: string; partNumber: string; quantity: number; unitPrice: number; urgency?: any }[]
  notes?: string
}) {
  const user = await getCurrentUserFromSession()
  if (!user) throw new Error('Unauthorized')

  const supabase = createClient()

  const { data: order, error: orderErr } = await supabase
    .from('part_orders')
    .insert({
      organization_id: user.organization_id,
      machine_id: data.machineId,
      created_by: user.id,
      status: 'draft',
      notes: data.notes
    })
    .select('id')
    .single()

  if (orderErr) throw orderErr

  const orderItems = data.items.map(item => ({
    part_order_id: order.id,
    part_id: item.partId,
    part_number: item.partNumber,
    quantity: item.quantity,
    unit_price: item.unitPrice,
    urgency: item.urgency ?? 'normal'
  }))

  const { error: itemsErr } = await supabase.from('part_order_items').insert(orderItems)
  if (itemsErr) throw itemsErr

  revalidatePath('/dashboard/procurement')
  return order
}

export async function searchParts(query: string) {
  const supabase = createClient()
  const { data } = await supabase
    .from('parts')
    .select('*')
    .ilike('name', `%${query}%`)
    .limit(10)
  return data ?? []
}

export async function createPartRequestAction(data: any) {
  return createPartOrderV9(data)
}

export async function createPartRequest(data: any) {
  return createPartOrderV9(data)
}

export async function approveQuote(id: string) {
  const supabase = createClient()
  return await supabase.from('part_orders').update({ status: 'ordered' }).eq('id', id)
}

export async function getPartRequests() {
  return getPartOrders()
}
