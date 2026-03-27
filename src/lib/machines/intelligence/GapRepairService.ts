import { createAiCoreClient } from '@/lib/machines/intelligence/db/aiCoreClient';
import { GeminiOrchestrator } from './GeminiOrchestrator';

export class GapRepairService {
  constructor(private orchestrator: GeminiOrchestrator) {}

  /**
   * Performs targeted N+1 pass based on audit findings.
   */
  async repair(runId: string, audit: any) {
    const supabase = createAiCoreClient();
    
    // 1. Log Gap Repair start
    const { data: patchRun } = await supabase.from('machine_kb_patch_runs').insert({
      run_id: runId,
      kb_id: audit.kb_id,
      machine_id: audit.machine_id,
      organization_id: audit.organization_id,
      pass_number: 1,
      targeted_gaps: audit.coverage_gaps
    }).select().single();

    if (!patchRun || !audit.coverage_gaps || audit.coverage_gaps.length === 0) return;

    const repairedItems: any[] = [];

    // 2. Real Targeted Extraction: For each gap, we ask Gemini to look specifically for it
    // Note: We use the Inventory to find the 'primary' manual to search in.
    const { data: primaryDocs } = await supabase
      .from('machine_document_inventory')
      .select('document_id, file_name')
      .eq('run_id', runId)
      .eq('is_primary_for_machine_truth', true);

    if (primaryDocs && primaryDocs.length > 0) {
      for (const gap of audit.coverage_gaps) {
        // We pick the first primary doc for this gap repair pass
        const docId = primaryDocs[0].document_id;
        
        // Fetch document content (already stored in extracts from Phase 5)
        const { data: previousExtract } = await supabase
          .from('machine_document_extracts')
          .select('extraction_json')
          .eq('document_id', docId)
          .order('version', { ascending: false })
          .limit(1)
          .single();

        if (previousExtract) {
          const repairPrompt = `GAP REPAIR PASS: The previous extraction missed technical details about: "${gap}". 
          Please re-examine the document data and provide the missing information in the canonical JSON format.`;
          
          try {
            const repairResult = await this.orchestrator.runGapRepair(JSON.stringify({
              gap,
              context: previousExtract.extraction_json
            }));

            repairedItems.push({ gap, result: repairResult });
          } catch (e) {
            console.error(`Failed to repair gap "${gap}":`, e);
          }
        }
      }
    }

    // 3. Update Patch Run
    await supabase
      .from('machine_kb_patch_runs')
      .update({
        repaired_items: repairedItems,
        status: 'completed'
      })
      .eq('id', patchRun.id);

    return {
      status: 'completed',
      repaired_count: repairedItems.length
    };
  }
}
