'use server'

/**
 * VB750-Specific Procurement Wrappers
 * Backward compatibility wrappers for generic procurement actions
 */

import { getAvailableParts, createProcurementOrder } from '@/domain/machines/actions/procurement'

interface ProcurementResult {
  machine: string
  total_items_available: number
  items: Array<{
    part_id: string
    part_number: string
    designation: string
    page_reference: number
    status: string
    confidence: string
  }>
  runtime_truth_source: string
  ready_for_ordering: boolean
  status: 'RUNTIME_PROVEN'
}

// VB750-specific wrapper for backward compatibility
export async function getVB750AvailableParts(): Promise<ProcurementResult> {
  return getAvailableParts('VB750')
}

// VB750-specific wrapper for backward compatibility
export async function createVB750ProcurementOrder(data: {
  machine_id?: string
  selected_part_ids: string[]
  quantities?: Record<string, number>
  notes?: string
}) {
  return createProcurementOrder('VB750', data)
}
