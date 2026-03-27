'use server'

/**
 * VB750-Specific Diagnostic Wrapper
 * Backward compatibility wrapper for generic diagnostic action
 */

import { diagnosMachine } from '@/domain/machines/actions/diagnostic'

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

// VB750-specific wrapper for backward compatibility
export async function diagnosVB750(problem: string): Promise<DiagnosticResult> {
  return diagnosMachine('VB750', problem)
}
