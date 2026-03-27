'use server';

import { createClient } from '@/lib/supabase/server';
import { getCurrentUserFromSession } from '@/lib/auth-bridge';
import { revalidatePath } from 'next/cache';
import type { EnrichedMaintenance } from '../transformers';

/**
 * Bridge: Accept enriched maintenance payload and trigger maintenance execution
 */
export async function executeMaintenanceFromEnriched(
  machineId: string,
  enriched: Partial<EnrichedMaintenance>
) {
  const user = await getCurrentUserFromSession();
  if (!user) return { success: false, error: 'Unauthorized' };

  if (!enriched.title) {
    return { success: false, error: 'Missing maintenance title' };
  }

  const supabase = createClient();

  try {
    // Store enriched checklist as a work order with structured metadata
    const { data: workOrder, error: woError } = await supabase
      .from('work_orders')
      .insert({
        organization_id: user.organization_id,
        machine_id: machineId,
        created_by: user.id,
        title: enriched.title || 'Maintenance Task',
        description: enriched.description || '',
        status: 'pending',
        priority: enriched.priority || 'medium',
        estimated_duration_minutes: enriched.estimated_duration_minutes || 30,
        // Store enriched metadata as structured data
        metadata: {
          maintenance_type: enriched.maintenance_type,
          required_tools: enriched.required_tools,
          required_parts: enriched.required_parts,
          preconditions: enriched.preconditions,
          post_checks: enriched.post_checks,
          checklist_steps: enriched.checklist_steps,
          evidence_summary: enriched.evidence_summary,
        },
      })
      .select('id')
      .single();

    if (woError || !workOrder) {
      return { success: false, error: woError?.message || 'Failed to create work order' };
    }

    // Store checklist steps if available
    if (enriched.checklist_steps && enriched.checklist_steps.length > 0) {
      const steps = enriched.checklist_steps.map((step, idx) => ({
        work_order_id: workOrder.id,
        sequence: step.sequence || idx + 1,
        title: step.description || `Step ${idx + 1}`,
        category: step.category || 'main',
        estimated_time_minutes: step.estimated_time_minutes || 10,
        required_tools: JSON.stringify(step.required_tools || []),
        required_parts: JSON.stringify(step.required_parts || []),
        completed: false,
      }));

      const { error: stepsError } = await supabase
        .from('work_order_steps')
        .insert(steps);

      if (stepsError) {
        console.error('Failed to insert checklist steps:', stepsError);
      }
    }

    revalidatePath(`/dashboard/machines/${machineId}`);
    return { success: true, workOrderId: workOrder.id };
  } catch (e: any) {
    console.error('[executeMaintenanceFromEnriched Error]', e);
    return { success: false, error: e.message };
  }
}
