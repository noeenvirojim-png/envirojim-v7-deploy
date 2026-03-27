/**
 * ENVIROJIM — bootstrapFamily
 * Idempotent. Creates minimum buckets for a machine family.
 * Generic subsystems/assemblies/components are only fallbacks —
 * real extracted data always takes precedence.
 */

import { createAiCoreClient } from '@/lib/machines/intelligence/db/aiCoreClient';
import { BOOTSTRAP_SUBSYSTEMS, type BootstrapSubsystem } from '../contracts';

export interface BootstrapFamilyParams {
  family_code: string;
  manufacturer: string;
  brand: string;
  model: string;
  variant?: string;
  description?: string;
}

export interface BootstrapResult {
  family_id: string;
  subsystem_ids: Record<BootstrapSubsystem, string>;
  assembly_ids: Record<BootstrapSubsystem, string>;
  component_ids: Record<BootstrapSubsystem, string>;
  created: boolean; // false = already existed
}

// Placeholder source document: bootstrapped families need a synthetic doc ref
// for FK constraints on subsystems/components/assemblies.
// We insert a 'bootstrap' source_document if none exists for this family.
async function ensureBootstrapDocument(
  supabase: ReturnType<typeof createAiCoreClient>,
  familyId: string,
): Promise<string> {
  const { data: existing } = await supabase
    .from('source_documents')
    .select('id')
    .eq('family_id', familyId)
    .eq('doc_key', 'bootstrap')
    .maybeSingle();

  if (existing) return existing.id;

  const { data, error } = await supabase
    .from('source_documents')
    .insert({
      family_id: familyId,
      doc_key: 'bootstrap',
      title: 'Bootstrap — Generic Placeholder',
      doc_type: 'other',
      language_code: 'en',
      revision_label: 'bootstrap-v1',
      source_filename: 'bootstrap.synthetic',
      file_sha256: `bootstrap-${familyId}`,
      page_count: 1,
      storage_path: 'bootstrap/synthetic',
      parse_status: 'parsed',
      is_synthetic: true,  // GUARD: never usable as official evidence
    })
    .select('id')
    .single();

  if (error) throw new Error(`bootstrapFamily.ensureBootstrapDocument: ${error.message}`);
  return data.id;
}

export async function bootstrapFamily(params: BootstrapFamilyParams): Promise<BootstrapResult> {
  const supabase = createAiCoreClient();

  // ─── 1. Family ─────────────────────────────────────────────────────────────
  const { data: existingFamily } = await supabase
    .from('machine_families')
    .select('id')
    .ilike('family_code', params.family_code)
    .maybeSingle();

  let familyId: string;
  let created = false;

  if (existingFamily) {
    familyId = existingFamily.id;
  } else {
    const { data, error } = await supabase
      .from('machine_families')
      .insert({
        family_code: params.family_code.toLowerCase(),
        manufacturer: params.manufacturer,
        brand: params.brand,
        model: params.model,
        variant: params.variant ?? 'not_in_source_document',
        description: params.description ?? 'not_in_source_document',
      })
      .select('id')
      .single();
    if (error) throw new Error(`bootstrapFamily.insertFamily: ${error.message}`);
    familyId = data.id;
    created = true;
  }

  const bootstrapDocId = await ensureBootstrapDocument(supabase, familyId);

  // ─── 2. Subsystems ─────────────────────────────────────────────────────────
  const subsystemIds: Record<string, string> = {};

  for (const code of BOOTSTRAP_SUBSYSTEMS) {
    const { data: existing } = await supabase
      .from('subsystems')
      .select('id')
      .eq('family_id', familyId)
      .ilike('subsystem_code', code)
      .maybeSingle();

    if (existing) {
      subsystemIds[code] = existing.id;
      continue;
    }

    const { data, error } = await supabase
      .from('subsystems')
      .insert({
        family_id: familyId,
        subsystem_code: code,
        name: code.replace(/_/g, ' '),
        category: code === 'global' ? 'general' : 'system',
        description: `Generic ${code.replace(/_/g, ' ')} subsystem — bootstrap placeholder`,
        safety_critical: ['shredding_unit', 'electrical_control', 'hydraulics'].includes(code),
        diagnostic_priority_rank: BOOTSTRAP_SUBSYSTEMS.indexOf(code as BootstrapSubsystem) + 1,
        official_source_document_id: bootstrapDocId,
        official_source_page: 1,
        official_source_snippet: `Bootstrap generic subsystem: ${code}`,
      })
      .select('id')
      .single();

    if (error) throw new Error(`bootstrapFamily.insertSubsystem[${code}]: ${error.message}`);
    subsystemIds[code] = data.id;
  }

  // ─── 3. Root assemblies (one per subsystem) ────────────────────────────────
  const assemblyIds: Record<string, string> = {};

  for (const code of BOOTSTRAP_SUBSYSTEMS) {
    const assemblyCode = `${code}_root`;

    const { data: existing } = await supabase
      .from('assemblies')
      .select('id')
      .eq('family_id', familyId)
      .ilike('assembly_code', assemblyCode)
      .maybeSingle();

    if (existing) {
      assemblyIds[code] = existing.id;
      continue;
    }

    const { data, error } = await supabase
      .from('assemblies')
      .insert({
        family_id: familyId,
        subsystem_id: subsystemIds[code],
        parent_assembly_id: null,
        assembly_code: assemblyCode,
        assembly_name: `${code.replace(/_/g, ' ')} root assembly`,
        assembly_type: 'generic_root',
        official_source_document_id: bootstrapDocId,
        official_source_page: 1,
        official_source_snippet: `Bootstrap generic root assembly: ${code}`,
      })
      .select('id')
      .single();

    if (error) throw new Error(`bootstrapFamily.insertAssembly[${code}]: ${error.message}`);
    assemblyIds[code] = data.id;
  }

  // ─── 4. Generic components (one per subsystem) ────────────────────────────
  const componentIds: Record<string, string> = {};

  for (const code of BOOTSTRAP_SUBSYSTEMS) {
    const componentCode = `${code}_generic`;

    const { data: existing } = await supabase
      .from('components')
      .select('id')
      .eq('family_id', familyId)
      .ilike('component_code', componentCode)
      .maybeSingle();

    if (existing) {
      componentIds[code] = existing.id;
      continue;
    }

    const { data, error } = await supabase
      .from('components')
      .insert({
        family_id: familyId,
        subsystem_id: subsystemIds[code],
        component_code: componentCode,
        name: `Generic ${code.replace(/_/g, ' ')} component`,
        function_summary: `Generic component placeholder for ${code} subsystem`,
        location_summary: 'not_in_source_document',
        component_type: 'generic',
        serviceable_flag: true,
        safety_critical_flag: ['shredding_unit', 'electrical_control'].includes(code),
        official_source_document_id: bootstrapDocId,
        official_source_page: 1,
        official_source_snippet: `Bootstrap generic component: ${code}`,
      })
      .select('id')
      .single();

    if (error) throw new Error(`bootstrapFamily.insertComponent[${code}]: ${error.message}`);
    componentIds[code] = data.id;
  }

  return {
    family_id: familyId,
    subsystem_ids: subsystemIds as Record<BootstrapSubsystem, string>,
    assembly_ids: assemblyIds as Record<BootstrapSubsystem, string>,
    component_ids: componentIds as Record<BootstrapSubsystem, string>,
    created,
  };
}
