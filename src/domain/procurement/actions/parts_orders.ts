'use server';

import { createClient } from '@/lib/supabase/server';
import { getCurrentUserFromSession } from '@/lib/auth-bridge';
import { revalidatePath } from 'next/cache';
import { sendNotification } from '@/domain/notifications/actions';

/**
 * Procurement - Parts Orders Actions
 */

export async function getPartsOrders() {
  const supabase = createClient();
  const user = await getCurrentUserFromSession();
  
  if (!user) throw new Error('Unauthorized');

  const { data, error } = await supabase
    .from('parts_orders')
    .select('*, part:parts_catalog(name, part_number)')
    .order('order_date', { ascending: false });

  if (error) throw error;
  return data;
}

export async function updatePartsOrderArrival(id: string, date: string) {
  const supabase = createClient();
  const user = await getCurrentUserFromSession();
  
  if (!user || (user.role !== 'SUPER_ADMIN' && user.role !== 'ENVIROJIM_ADMIN')) {
    throw new Error('Unauthorized: Admin access required');
  }

  // 1. Fetch current order to find organization/requester
  const { data: order } = await supabase
    .from('parts_orders')
    .select('id, organization_id, part_name_override')
    .eq('id', id)
    .single();

  // 2. Update order
  const { error } = await supabase
    .from('parts_orders')
    .update({ expected_arrival: date, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;

  // 3. Notify organization admins/requesters (Simulated: notify current admin for now or all users in org)
  await sendNotification({
    userId: user.id, // In a real scenario, this would be the requester's ID
    title: 'Mise à jour de livraison',
    message: `La date d'arrivée pour ${order?.part_name_override || 'une pièce'} a été fixée au ${date}.`,
    type: 'ALERT',
    linkUrl: '/dashboard/parts'
  });

  revalidatePath('/dashboard/parts');
  revalidatePath('/dashboard/admin/parts');
  return { success: true };
}
