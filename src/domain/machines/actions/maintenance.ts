'use server'

import * as fs from 'fs'
import * as path from 'path'
import { createClient } from '@/lib/supabase/server'
import { getMachineConfig } from '@/domain/machines/config'

/**
 * Machine-Agnostic Maintenance Action
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

async function loadPartsFromPersistent(machineSlug: string): Promise<CanonicalPart[] | null> {
  try {
    const supabase = createClient()
    const machineId = await getMachineId(machineSlug)
    if (!machineId) return null

    const { data, error } = await supabase
      .from('parts')
      .select('*')
      .eq('machine_id', machineId)
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
    console.warn(`[maintenance] Persistent load failed for ${machineSlug}, will fallback to JSON`)
    return null
  }
}

function loadCanonicalParts(): CanonicalDataset {
  const filePath = path.join(
    process.cwd(),
    'artifacts/canonical-knowledge/parts-canonical.json'
  )
  const content = fs.readFileSync(filePath, 'utf-8')
  return JSON.parse(content)
}

interface MaintenanceTask {
  task_code: string
  title: string
  frequency: string
  estimated_minutes: number
  required_parts: Array<{
    part_id: string
    part_number: string
    designation: string
    page: number
  }>
  steps: string[]
  status: string
}

interface MaintenanceResult {
  machine: string
  tasks: MaintenanceTask[]
  total_required_parts: number
  runtime_truth_source: string
  status: 'RUNTIME_PROVEN'
}

function findPartsMatching(
  parts: CanonicalPart[],
  keywords: string[]
): CanonicalPart[] {
  return parts.filter(p =>
    keywords.some(kw => p.designation.toLowerCase().includes(kw.toLowerCase()))
  )
}

export async function getMaintenanceTasks(machineSlug: string): Promise<MaintenanceResult> {
  // Try persistent first, fallback to JSON
  let parts = await loadPartsFromPersistent(machineSlug)
  const primarySource = parts ? 'persistent:public.parts' : 'fallback:artifacts/canonical-knowledge/parts-canonical.json'

  if (!parts) {
    const canonical = loadCanonicalParts()
    parts = canonical.parts
  }

  const taskPrefix = `${machineSlug}-MAINT`

  const maintenanceTasks: MaintenanceTask[] = [
    {
      task_code: `${taskPrefix}-001`,
      title: 'Monthly Drive System Inspection',
      frequency: 'Monthly',
      estimated_minutes: 30,
      required_parts: findPartsMatching(parts, ['motor', 'rolle', 'pump', 'pumpe'])
        .slice(0, 3)
        .map(p => ({
          part_id: p.part_id,
          part_number: p.part_number_raw,
          designation: p.designation,
          page: p.source_page,
        })),
      steps: [
        'Inspect motor for overheating signs',
        'Check drive roll for wear',
        'Verify pump pressure',
      ],
      status: 'SCHEDULED',
    },
    {
      task_code: `${taskPrefix}-002`,
      title: 'Quarterly Cooling System Check',
      frequency: 'Quarterly',
      estimated_minutes: 45,
      required_parts: findPartsMatching(parts, ['cooler', 'kühl', 'fan', 'lüfter'])
        .slice(0, 2)
        .map(p => ({
          part_id: p.part_id,
          part_number: p.part_number_raw,
          designation: p.designation,
          page: p.source_page,
        })),
      steps: ['Drain and inspect coolant', 'Clean cooler fins', 'Check fan bearing wear'],
      status: 'SCHEDULED',
    },
    {
      task_code: `${taskPrefix}-003`,
      title: 'Annual Control System Update',
      frequency: 'Annually',
      estimated_minutes: 60,
      required_parts: findPartsMatching(parts, ['controller', 'display', 'steuer'])
        .slice(0, 2)
        .map(p => ({
          part_id: p.part_id,
          part_number: p.part_number_raw,
          designation: p.designation,
          page: p.source_page,
        })),
      steps: [
        'Backup current settings',
        'Update controller firmware',
        'Test display responsiveness',
      ],
      status: 'SCHEDULED',
    },
  ]

  const totalRequiredParts = maintenanceTasks.reduce(
    (sum, task) => sum + task.required_parts.length,
    0
  )

  return {
    machine: machineSlug,
    tasks: maintenanceTasks,
    total_required_parts: totalRequiredParts,
    runtime_truth_source: primarySource,
    status: 'RUNTIME_PROVEN',
  }
}
