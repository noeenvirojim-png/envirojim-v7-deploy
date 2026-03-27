/**
 * ENVIROJIM — resolveMachineFamily
 *
 * Resolves a legacy public.machines.id → ai_core.machine_families.id.
 *
 * Resolution order (explicit, no silent fallback):
 * 1. ai_core.legacy_machine_map  — explicit stored mapping
 * 2. ai_core.machines            — v5 machines with family_id
 * 3. Legacy model match          — public.machines.model ilike ai_core.machine_families.model
 *    → on match, writes entry to ai_core.legacy_machine_map (auto-cache)
 * 4. HARD FAIL — MachineResolutionError, never silently null
 */

import { createClient } from '@/lib/supabase/server';
import { createAiCoreClient } from '@/lib/machines/intelligence/db/aiCoreClient';

export interface MachineResolution {
  machine_id: string;
  family_id: string;
  resolution_source: 'legacy_map' | 'ai_core_machine' | 'legacy_model_match';
}

export class MachineResolutionError extends Error {
  constructor(machineId: string, detail: string) {
    super(`resolveMachineFamily: cannot resolve machine ${machineId} — ${detail}`);
    this.name = 'MachineResolutionError';
  }
}

export async function resolveMachineFamily(machineId: string): Promise<MachineResolution> {
  const publicClient = createClient();          // public schema — legacy machines
  const aiClient = createAiCoreClient();        // ai_core schema — families, map

  // ── 1. Explicit legacy map ──────────────────────────────────────────────────
  const { data: mapped } = await aiClient
    .from('legacy_machine_map')
    .select('family_id')
    .eq('legacy_machine_id', machineId)
    .maybeSingle();

  if (mapped?.family_id) {
    return { machine_id: machineId, family_id: mapped.family_id, resolution_source: 'legacy_map' };
  }

  // ── 2. ai_core.machines (v5 instances) ────────────────────────────────────
  const { data: aiMachine } = await aiClient
    .from('machines')
    .select('family_id')
    .eq('id', machineId)
    .maybeSingle();

  if (aiMachine?.family_id) {
    return { machine_id: machineId, family_id: aiMachine.family_id, resolution_source: 'ai_core_machine' };
  }

  // ── 3. Legacy model match ──────────────────────────────────────────────────
  const { data: legacyMachine } = await publicClient
    .from('machines')
    .select('id, model, manufacturer, brand')
    .eq('id', machineId)
    .maybeSingle();

  if (legacyMachine) {
    const searchTerms = [legacyMachine.model, legacyMachine.brand, legacyMachine.manufacturer]
      .filter(Boolean);

    for (const term of searchTerms) {
      const { data: family } = await aiClient
        .from('machine_families')
        .select('id')
        .ilike('model', `%${term}%`)
        .maybeSingle();

      if (family) {
        // Cache the mapping so next call uses path 1
        await aiClient.from('legacy_machine_map').upsert({
          legacy_machine_id: machineId,
          family_id: family.id,
          mapped_by: 'auto_model_match',
          notes: `matched on term: ${term}`,
        }, { onConflict: 'legacy_machine_id' });

        return {
          machine_id: machineId,
          family_id: family.id,
          resolution_source: 'legacy_model_match',
        };
      }
    }
  }

  // ── 4. Hard fail ───────────────────────────────────────────────────────────
  throw new MachineResolutionError(
    machineId,
    'not in legacy_machine_map, not in ai_core.machines, no model match in ai_core.machine_families. ' +
    'Run bootstrapFamily + buildFamilyKnowledge for this machine first.',
  );
}
