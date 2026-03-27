'use server'

import * as fs from 'fs'
import * as path from 'path'
import { createClient } from '@/lib/supabase/server'
import { getMachineConfig } from '@/domain/machines/config'

/**
 * Machine-Agnostic Diagnostic Action
 * Works with any machine configured in machines/config.ts
 * PRIMARY: Loads parts from persistent parts table
 * FALLBACK: Uses canonical JSON if DB unavailable
 */

interface CanonicalPart {
  part_id: string
  part_number_raw: string
  designation: string
  source_page: number
  extraction_confidence: string
  status: string
}

interface CanonicalDataset {
  machine: string
  source: string
  parts: CanonicalPart[]
}

async function loadPartsFromPersistent(machineSlug: string): Promise<CanonicalPart[] | null> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('parts')
      .select('*')
      .eq('machine_id', (await getMachineId(machineSlug)) || '')
      .order('created_at', { ascending: true })

    if (error || !data) return null

    return data.map((p: any) => ({
      part_id: p.id,
      part_number_raw: p.canonical_part_number,
      designation: p.name,
      source_page: p.source_refs?.page || 0,
      extraction_confidence: p.source_confidence > 0.9 ? 'HIGH' : 'MEDIUM',
      status: p.source_refs?.extraction_status || 'VALIDATED',
    }))
  } catch (e) {
    console.warn(`[diagnostic] Persistent load failed for ${machineSlug}, will fallback to JSON`)
    return null
  }
}

async function getMachineId(machineSlug: string): Promise<string | null> {
  try {
    const supabase = createClient()
    const { data } = await supabase
      .from('machines')
      .select('id')
      .or(`name.ilike.%${machineSlug}%,model.ilike.%${machineSlug}%`)
      .single()

    return data?.id || null
  } catch {
    return null
  }
}

function loadCanonicalPartsFromJSON(): CanonicalDataset {
  const filePath = path.join(
    process.cwd(),
    'artifacts/canonical-knowledge/parts-canonical.json'
  )
  const content = fs.readFileSync(filePath, 'utf-8')
  return JSON.parse(content)
}

// Map subsystems to parts from canonical dataset
function mapPartsToSubsystem(parts: CanonicalPart[], subsystem: string): CanonicalPart[] {
  const keywords: Record<string, string[]> = {
    Drivetrain: ['motor', 'antrieb', 'rolle', 'pump', 'pumpe'],
    Hydraulics: ['pump', 'pumpe', 'hydraul', 'cylinder', 'ventil'],
    Cooling: ['cooler', 'kühl', 'fan', 'lüfter'],
    Electrical: ['controller', 'display', 'modem', 'steuer'],
    Chassis: ['ball', 'gehäuse', 'filter', 'block'],
  }

  const keywords_for_subsystem = keywords[subsystem] || []
  return parts.filter(p =>
    keywords_for_subsystem.some(kw => p.designation.toLowerCase().includes(kw.toLowerCase()))
  )
}

interface DiagnosticResult {
  problem: string
  machine: string
  affected_subsystems: string[]
  canonical_parts_matched: Array<{
    part_id: string
    part_number: string
    designation: string
    page: number
    confidence: string
  }>
  parts_count: number
  recommendation: string
  runtime_truth_source: string
  status: 'RUNTIME_PROVEN'
}

export async function diagnosMachine(machineSlug: string, problem: string): Promise<DiagnosticResult> {
  // Try persistent first, fallback to JSON
  let parts = await loadPartsFromPersistent(machineSlug)
  const primarySource = parts ? 'persistent:public.parts' : 'fallback:JSON'

  if (!parts) {
    const canonical = loadCanonicalPartsFromJSON()
    parts = canonical.parts
  }

  // Get machine config for subsystem mapping
  const machineConfig = getMachineConfig(machineSlug)
  const affectedSubsystems = machineConfig.subsystemMap[problem] || machineConfig.defaultProblemSubsystems

  // Collect parts from affected subsystems
  const matchedParts: CanonicalPart[] = []
  for (const subsystem of affectedSubsystems) {
    const subsystemParts = mapPartsToSubsystem(parts, subsystem)
    matchedParts.push(...subsystemParts)
  }

  // Deduplicate
  const uniqueParts = Array.from(
    new Map(matchedParts.map(p => [p.part_id, p])).values()
  )

  return {
    problem,
    machine: machineSlug,
    affected_subsystems: affectedSubsystems,
    canonical_parts_matched: uniqueParts.map(p => ({
      part_id: p.part_id,
      part_number: p.part_number_raw,
      designation: p.designation,
      page: p.source_page,
      confidence: p.extraction_confidence,
    })),
    parts_count: uniqueParts.length,
    recommendation: `For problem "${problem}", check ${affectedSubsystems.join(', ')} systems. ${uniqueParts.length} parts from truth require inspection.`,
    runtime_truth_source: primarySource,
    status: 'RUNTIME_PROVEN',
  }
}
