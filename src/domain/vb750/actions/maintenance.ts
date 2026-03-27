'use server'

/**
 * VB750-Specific Maintenance Wrapper
 * Backward compatibility wrapper for generic maintenance action
 */

import { getMaintenanceTasks } from '@/domain/machines/actions/maintenance'

interface MaintenanceResult {
  machine: string
  tasks: Array<{
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
  }>
  total_required_parts: number
  runtime_truth_source: string
  status: 'RUNTIME_PROVEN'
}

// VB750-specific wrapper for backward compatibility
export async function getVB750MaintenanceTasks(): Promise<MaintenanceResult> {
  return getMaintenanceTasks('VB750')
}
