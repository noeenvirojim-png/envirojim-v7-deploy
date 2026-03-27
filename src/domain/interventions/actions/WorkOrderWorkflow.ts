'use server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserFromSession } from '@/lib/auth-bridge'
import { revalidatePath } from 'next/cache'

export async function createWorkOrderV9(data: {
  machineId: string
  title: string
  description?: string
  priority: 'low' | 'normal' | 'high' | 'urgent'
  diagnosticId?: string
}) {
  const user = await getCurrentUserFromSession()
  if (!user) throw new Error('Authentification requise')

  const supabase = createClient()

  // Verify machine context
  const { data: machine } = await supabase
    .from('machines')
    .select('organization_id')
    .eq('id', data.machineId)
    .single()

  if (!machine) throw new Error('Machine non trouvée')

  // SQL Trigger trg_work_orders_machine_org_match (SQL V9 line 612) enforces consistency
  const { data: wo, error } = await supabase
    .from('work_orders')
    .insert({
      organization_id: machine.organization_id, // Mandatory match
      machine_id: data.machineId,
      created_by: user.id,
      title: data.title,
      description: data.description,
      priority: data.priority,
      status: 'scheduled',
      related_diagnostic_id: data.diagnosticId
    })
    .select()
    .single()

  if (error) throw error

  revalidatePath('/dashboard')
  revalidatePath(`/dashboard/machines/${data.machineId}`)

  return wo
}

export async function updateWorkOrderStatus(id: string, status: any) {
  const supabase = createClient()
  const { error } = await supabase
    .from('work_orders')
    .update({ status })
    .eq('id', id)

  if (error) throw error
  revalidatePath('/dashboard')
}

export async function getWorkOrders() {
  const user = await getCurrentUserFromSession()
  if (!user) return []
  const supabase = createClient()
  const { data } = await supabase
    .from('work_orders')
    .select('*, machines(*)')
    .eq('organization_id', user.organization_id)
    .order('created_at', { ascending: false })
  return data ?? []
}
