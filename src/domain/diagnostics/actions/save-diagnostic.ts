'use server';

import { createClient } from '@/lib/supabase/server';
import { getCurrentUserFromSession } from '@/lib/auth-bridge';
import { revalidatePath } from 'next/cache';

export interface DiagnosticSessionData {
  machine_id: string;
  query: string;
  top_cluster_name: string;
  playbook_steps: Array<{
    step: number;
    title: string;
    description: string;
    type: string;
    completed: boolean;
  }>;
  related_faults: string[];
  related_maintenance: string[];
  related_parts: string[];
  evidence_refs: string[];
}

export async function saveDiagnosticSession(data: DiagnosticSessionData) {
  const user = await getCurrentUserFromSession();
  if (!user) return { success: false, error: 'Non authentifié' };

  const supabase = createClient();

  try {
    // Save as internal ticket with diagnostic metadata
    const completedSteps = data.playbook_steps.filter(s => s.completed);
    const description = `
DIAGNOSTIC REPORT
================

Query: ${data.query}
Cluster Match: ${data.top_cluster_name}

Playbook Progress: ${completedSteps.length}/${data.playbook_steps.length} steps completed

Steps:
${data.playbook_steps.map(s => `- [${s.completed ? 'x' : ' '}] Step ${s.step}: ${s.title}`).join('\n')}

Related Parts (${data.related_parts.length}):
${data.related_parts.slice(0, 5).map(p => `- ${p}`).join('\n') || 'None'}

Related Maintenance (${data.related_maintenance.length}):
${data.related_maintenance.slice(0, 3).map(m => `- ${m}`).join('\n') || 'None'}

Related Faults (${data.related_faults.length}):
${data.related_faults.slice(0, 3).map(f => `- ${f}`).join('\n') || 'None'}

Evidence References: ${data.evidence_refs.length || 0}
    `.trim();

    const { data: ticket, error } = await supabase
      .from('internal_tickets')
      .insert({
        organization_id: user.organization_id,
        machine_id: data.machine_id,
        creator_id: user.id,
        title: `Diagnostic: ${data.top_cluster_name}`,
        description,
        status: 'OPEN',
        is_transferred_to_envirojim: false,
      })
      .select('id')
      .single();

    if (error) throw error;

    revalidatePath(`/dashboard/machines/${data.machine_id}`);
    return { success: true, diagnosticId: ticket.id };
  } catch (e: any) {
    console.error('[saveDiagnosticSession Error]', e);
    return { success: false, error: e.message };
  }
}
