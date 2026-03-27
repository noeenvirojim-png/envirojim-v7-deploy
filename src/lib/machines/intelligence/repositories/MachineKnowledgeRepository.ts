/**
 * ENVIROJIM — MachineKnowledgeRepository
 * All reads from the v5 AI core schema. No writes. No inference.
 */

import { createAiCoreClient } from '@/lib/machines/intelligence/db/aiCoreClient';
import type {
  OfficialPart, EvidenceRef, BootstrapSubsystem, BOOTSTRAP_SUBSYSTEMS,
} from '../contracts';

export class MachineKnowledgeRepository {
  private supabase = createAiCoreClient();

  // ─── Family ────────────────────────────────────────────────────────────────

  async getFamilyByCode(familyCode: string) {
    const { data, error } = await this.supabase
      .from('machine_families')
      .select('*')
      .eq('family_code', familyCode.toLowerCase())
      .single();
    if (error) throw new Error(`getFamilyByCode: ${error.message}`);
    return data;
  }

  async getFamilyById(familyId: string) {
    const { data, error } = await this.supabase
      .from('machine_families')
      .select('*')
      .eq('id', familyId)
      .single();
    if (error) throw new Error(`getFamilyById: ${error.message}`);
    return data;
  }

  // ─── Subsystems ────────────────────────────────────────────────────────────

  async getSubsystemsByFamily(familyId: string) {
    const { data, error } = await this.supabase
      .from('subsystems')
      .select('*')
      .eq('family_id', familyId)
      .order('diagnostic_priority_rank');
    if (error) throw new Error(`getSubsystemsByFamily: ${error.message}`);
    return data ?? [];
  }

  async getSubsystemByCode(familyId: string, subsystemCode: string) {
    const { data, error } = await this.supabase
      .from('subsystems')
      .select('*')
      .eq('family_id', familyId)
      .ilike('subsystem_code', subsystemCode)
      .maybeSingle();
    if (error) throw new Error(`getSubsystemByCode: ${error.message}`);
    return data;
  }

  // ─── Parts ─────────────────────────────────────────────────────────────────

  async getOfficialConfirmedParts(familyId: string): Promise<OfficialPart[]> {
    const { data, error } = await this.supabase
      .from('parts')
      .select('*')
      .eq('family_id', familyId)
      .eq('validation_status', 'official_confirmed')
      .not('official_source_document_id', 'is', null)
      .not('official_source_page', 'is', null);
    if (error) throw new Error(`getOfficialConfirmedParts: ${error.message}`);
    return (data ?? []).filter(p => p.part_number?.trim() && p.official_source_snippet?.trim());
  }

  async getPartByNumber(familyId: string, partNumber: string): Promise<OfficialPart | null> {
    const { data, error } = await this.supabase
      .from('parts')
      .select('*')
      .eq('family_id', familyId)
      .ilike('part_number', partNumber)
      .maybeSingle();
    if (error) throw new Error(`getPartByNumber: ${error.message}`);
    return data;
  }

  async getPartsBySubsystem(familyId: string, subsystemId: string): Promise<OfficialPart[]> {
    const { data, error } = await this.supabase
      .from('parts')
      .select('*')
      .eq('family_id', familyId)
      .eq('subsystem_id', subsystemId);
    if (error) throw new Error(`getPartsBySubsystem: ${error.message}`);
    return data ?? [];
  }

  async getBlockedParts(familyId: string) {
    const { data, error } = await this.supabase
      .from('parts')
      .select('id, part_number, part_name, validation_status')
      .eq('family_id', familyId)
      .eq('validation_status', 'blocked_incomplete');
    if (error) throw new Error(`getBlockedParts: ${error.message}`);
    return data ?? [];
  }

  // ─── Fault symptoms ────────────────────────────────────────────────────────

  async getFaultSymptomsByFamily(familyId: string) {
    const { data, error } = await this.supabase
      .from('fault_symptoms')
      .select('*, subsystems(subsystem_code, name)')
      .eq('family_id', familyId);
    if (error) throw new Error(`getFaultSymptomsByFamily: ${error.message}`);
    return data ?? [];
  }

  async searchFaultSymptoms(familyId: string, normalizedQuery: string) {
    const { data, error } = await this.supabase
      .from('fault_symptoms')
      .select('*')
      .eq('family_id', familyId)
      .ilike('normalized_symptom', `%${normalizedQuery}%`);
    if (error) throw new Error(`searchFaultSymptoms: ${error.message}`);
    return data ?? [];
  }

  // ─── Diagnostic links ──────────────────────────────────────────────────────

  async getDiagnosticLinksForSymptom(symptomId: string) {
    const { data, error } = await this.supabase
      .from('diagnostic_links')
      .select(`
        *,
        fault_causes(*),
        diagnostic_tests(*),
        diagnostic_link_parts(part_id, ranking, parts(*)),
        diagnostic_link_procedures(procedure_id, ranking, procedures(*))
      `)
      .eq('symptom_id', symptomId)
      .order('likelihood_rank');
    if (error) throw new Error(`getDiagnosticLinksForSymptom: ${error.message}`);
    return data ?? [];
  }

  // ─── Procedures ────────────────────────────────────────────────────────────

  async getProcedureByCode(familyId: string, procedureCode: string) {
    const { data, error } = await this.supabase
      .from('procedures')
      .select('*, procedure_steps(*)')
      .eq('family_id', familyId)
      .ilike('procedure_code', procedureCode)
      .maybeSingle();
    if (error) throw new Error(`getProcedureByCode: ${error.message}`);
    return data;
  }

  // ─── Maintenance tasks ─────────────────────────────────────────────────────

  async getMaintenanceTasksByFamily(familyId: string) {
    const { data, error } = await this.supabase
      .from('maintenance_tasks')
      .select(`
        *,
        procedures(*),
        maintenance_task_parts(*, parts(*))
      `)
      .eq('family_id', familyId);
    if (error) throw new Error(`getMaintenanceTasksByFamily: ${error.message}`);
    return data ?? [];
  }

  // ─── Checklist templates ───────────────────────────────────────────────────

  async getChecklistTemplate(familyId: string, templateCode: string) {
    const { data, error } = await this.supabase
      .from('checklist_templates')
      .select('*, checklist_items(*)')
      .eq('family_id', familyId)
      .ilike('template_code', templateCode)
      .maybeSingle();
    if (error) throw new Error(`getChecklistTemplate: ${error.message}`);
    return data;
  }

  async getChecklistTemplatesByAudience(familyId: string, audience: string) {
    const { data, error } = await this.supabase
      .from('checklist_templates')
      .select('*, checklist_items(*)')
      .eq('family_id', familyId)
      .eq('audience', audience);
    if (error) throw new Error(`getChecklistTemplatesByAudience: ${error.message}`);
    return data ?? [];
  }

  // ─── Evidence ──────────────────────────────────────────────────────────────

  async getEvidenceForObject(objectType: string, objectId: string): Promise<EvidenceRef[]> {
    const { data, error } = await this.supabase
      .from('evidence')
      .select('*')
      .eq('object_type', objectType)
      .eq('object_id', objectId);
    if (error) throw new Error(`getEvidenceForObject: ${error.message}`);
    return (data ?? []).map(e => ({
      source_document_id: e.source_document_id,
      source_page: e.source_page,
      source_snippet: e.source_snippet,
      normalized_excerpt: e.normalized_excerpt,
      evidence_role: e.evidence_role,
      extraction_method: e.extraction_method,
      confidence_score: e.confidence_score,
    }));
  }

  // ─── Source documents ──────────────────────────────────────────────────────

  async getSourceDocumentsByFamily(familyId: string) {
    const { data, error } = await this.supabase
      .from('source_documents')
      .select('*')
      .eq('family_id', familyId)
      .order('created_at', { ascending: false });
    if (error) throw new Error(`getSourceDocumentsByFamily: ${error.message}`);
    return data ?? [];
  }

  async getDocumentPagesByDocument(sourceDocumentId: string) {
    const { data, error } = await this.supabase
      .from('document_pages')
      .select('*')
      .eq('source_document_id', sourceDocumentId)
      .order('page_number');
    if (error) throw new Error(`getDocumentPagesByDocument: ${error.message}`);
    return data ?? [];
  }

  // ─── Data quality ──────────────────────────────────────────────────────────

  async getBlockingIssues(familyId: string) {
    const { data, error } = await this.supabase
      .from('data_quality_issues')
      .select('*')
      .eq('family_id', familyId)
      .eq('blocking_flag', true)
      .neq('resolution_status', 'resolved')
      .order('severity');
    if (error) throw new Error(`getBlockingIssues: ${error.message}`);
    return data ?? [];
  }

  // ─── Inference policies ────────────────────────────────────────────────────

  async getInferencePolicy(familyId: string) {
    const { data } = await this.supabase
      .from('inference_policies')
      .select('*')
      .eq('family_id', familyId)
      .maybeSingle();
    return data;
  }
}
