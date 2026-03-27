import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { config as loadEnv } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

loadEnv({ path: path.resolve(process.cwd(), '.env.local') })

type Json = string | number | boolean | null | Json[] | { [key: string]: Json }

type PartRow = {
  id: string
  machine_id: string
  organization_id?: string
  name: string | null
  canonical_part_number: string | null
}

type KbEntityRow = {
  id: string
  canonical_name: string | null
  entity_type: string
}

type KbEvidenceRow = {
  entity_id: string
  source_page: string | null
  section_title: string | null
  evidence_snippet: string | null
}

type ManualChunkRow = {
  page_number: number | null
  section_title: string | null
  chunk_text: string | null
}

type CandidateRow = {
  validation_run_id: string
  machine_id: string
  organization_id?: string
  source_part_id: string | null
  source_kb_entity_ids: string[]
  raw_label: string
  normalized_label: string
  raw_part_number: string
  normalized_part_number: string
  source_pages: string[]
  primary_source_page: string
  section_titles: string[]
  evidence_snippets: string[]
  evidence_count: number
  flags: string[]
  validation_status: 'validated' | 'needs_review' | 'rejected'
  review_reason: string
  duplicate_group_key: string
}

type PageCoverageRow = {
  validation_run_id: string
  machine_id: string
  organization_id?: string
  page_number: string
  chunk_count: number
  part_signal_score: number
  candidate_count: number
  validated_candidate_count: number
  coverage_status: 'covered' | 'needs_review' | 'no_part_expected' | 'unknown'
  sample_snippet: string
  flags: string[]
}

function getArg(name: string): string | undefined {
  const flag = `--${name}`
  const idx = process.argv.indexOf(flag)
  return idx >= 0 ? process.argv[idx + 1] : undefined
}

function normalizeText(value: string | null | undefined): string {
  return String(value ?? '')
    .normalize('NFKC')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizeLabel(value: string | null | undefined): string {
  return normalizeText(value).toLowerCase()
}

function normalizePartNumber(value: string | null | undefined): string {
  return normalizeText(value)
    .toUpperCase()
    .replace(/\s+/g, '')
    .replace(/[-_.]/g, '')
}

function dedupeStrings(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.map(v => normalizeText(v)).filter(Boolean))]
}

function csvEscape(value: unknown): string {
  const text =
    value == null
      ? ''
      : Array.isArray(value) || typeof value === 'object'
        ? JSON.stringify(value)
        : String(value)
  return `"${text.replace(/"/g, '""')}"`
}

function toCsv(rows: Array<Record<string, unknown>>): string {
  if (!rows.length) return ''
  const headers = Object.keys(rows[0])
  const lines = [headers.map(csvEscape).join(',')]
  for (const row of rows) {
    lines.push(headers.map(key => csvEscape(row[key])).join(','))
  }
  return lines.join('\n')
}

function batch<T>(items: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}

function countPartSignals(text: string): number {
  const signals = [
    /\br[ée]f\.?\b/gi,
    /\bpart\b/gi,
    /\bpi[èe]ce\b/gi,
    /\bpos\.?\b/gi,
    /\bqty\b/gi,
    /\bqt[ée]\b/gi,
    /\barticle\b/gi,
    /\bnr\.?\b/gi,
    /\bn[o°]\b/gi,
    /\bst[üu]ck\b/gi,
    /\bkit\b/gi,
    /\bvis\b/gi,
    /\bboulon\b/gi,
    /\bjoint\b/gi,
    /\bpignon\b/gi,
    /\bcha[iî]ne\b/gi,
    /\broulement\b/gi,
    /\bhydraulique\b/gi,
  ]

  return signals.reduce((sum, rx) => sum + (text.match(rx)?.length ?? 0), 0)
}

function setStatus(candidate: CandidateRow): void {
  candidate.flags = [...new Set(candidate.flags)]
  candidate.review_reason = candidate.flags.join(', ')
  candidate.validation_status = candidate.flags.length ? 'needs_review' : 'validated'
}

async function main(): Promise<void> {
  const machineId = getArg('machine-id')
  const organizationId = getArg('organization-id')
  const ingestionRunId = getArg('ingestion-run-id')
  const sourceDocumentId = getArg('source-document-id')

  if (!machineId || !organizationId) {
    throw new Error(
      'Usage: npx tsx scripts/build-parts-validation-report.ts --machine-id <uuid> --organization-id <uuid> [--ingestion-run-id <uuid>] [--source-document-id <uuid>]'
    )
  }

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL

  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase credentials in .env.local')
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: runData, error: runError } = await supabase
    .from('machine_part_validation_runs')
    .insert({
      machine_id: machineId,
      organization_id: organizationId,
      ingestion_run_id: ingestionRunId ?? null,
      source_document_id: sourceDocumentId ?? null,
      status: 'running',
      summary: {},
    })
    .select('id')
    .single()

  if (runError || !runData?.id) {
    throw new Error(`Failed to create machine_part_validation_runs row: ${runError?.message ?? 'unknown error'}`)
  }

  const validationRunId = runData.id as string

  const [
    partsRes,
    kbEntitiesRes,
    kbEvidenceRes,
    manualChunksRes,
  ] = await Promise.all([
    supabase
      .from('parts')
      .select('id,machine_id,name,canonical_part_number')
      .eq('machine_id', machineId),

    supabase
      .from('machine_kb_entities')
      .select('id,canonical_name,entity_type')
      .eq('machine_id', machineId)
      .eq('entity_type', 'part'),

    supabase
      .from('machine_kb_evidence')
      .select('entity_id,source_page,section_title,evidence_snippet')
      .eq('machine_id', machineId),

    supabase
      .from('manual_chunks')
      .select('page_number,section_title,chunk_text')
      .eq('machine_id', machineId),
  ])

  if (partsRes.error) throw new Error(`parts query failed: ${partsRes.error.message}`)
  if (kbEntitiesRes.error) throw new Error(`machine_kb_entities query failed: ${kbEntitiesRes.error.message}`)
  if (kbEvidenceRes.error) throw new Error(`machine_kb_evidence query failed: ${kbEvidenceRes.error.message}`)
  if (manualChunksRes.error) throw new Error(`manual_chunks query failed: ${manualChunksRes.error.message}`)

  const parts = (partsRes.data ?? []) as PartRow[]
  const kbEntities = (kbEntitiesRes.data ?? []) as KbEntityRow[]
  const kbEvidence = (kbEvidenceRes.data ?? []) as KbEvidenceRow[]
  const manualChunks = (manualChunksRes.data ?? []) as ManualChunkRow[]

  const partById = new Map(parts.map(part => [part.id, part]))
  const kbEntitiesBySourcePartId = new Map<string, KbEntityRow[]>()
  const kbEntitiesByNormalizedLabel = new Map<string, KbEntityRow[]>()
  const kbEvidenceByEntityId = new Map<string, KbEvidenceRow[]>()

  for (const entity of kbEntities) {
    const normalized = normalizeLabel(entity.canonical_name)
    if (normalized) {
      const bucket = kbEntitiesByNormalizedLabel.get(normalized) ?? []
      bucket.push(entity)
      kbEntitiesByNormalizedLabel.set(normalized, bucket)
    }
  }

  for (const ev of kbEvidence) {
    const bucket = kbEvidenceByEntityId.get(ev.entity_id) ?? []
    bucket.push(ev)
    kbEvidenceByEntityId.set(ev.entity_id, bucket)
  }

  const candidates: CandidateRow[] = []

  for (const part of parts) {
    const rawLabel = normalizeText(part.name)
    const rawPartNumber = normalizeText(part.canonical_part_number)
    const normalizedLabel = normalizeLabel(rawLabel)
    const normalizedPartNumber = normalizePartNumber(rawPartNumber)

    const linkedEntities =
      kbEntitiesByNormalizedLabel.get(normalizedLabel) ??
      []

    const linkedEvidence = linkedEntities.flatMap(entity => kbEvidenceByEntityId.get(entity.id) ?? [])

    const sourcePages = dedupeStrings(linkedEvidence.map(ev => ev.source_page))
    const sectionTitles = dedupeStrings(linkedEvidence.map(ev => ev.section_title))
    const evidenceSnippets = dedupeStrings(linkedEvidence.map(ev => ev.evidence_snippet)).slice(0, 3)

    const candidate: CandidateRow = {
      validation_run_id: validationRunId,
      machine_id: machineId,
      organization_id: organizationId,
      source_part_id: part.id,
      source_kb_entity_ids: linkedEntities.map(entity => entity.id),
      raw_label: rawLabel,
      normalized_label: normalizedLabel,
      raw_part_number: rawPartNumber,
      normalized_part_number: normalizedPartNumber,
      source_pages: sourcePages,
      primary_source_page: sourcePages[0] ?? '',
      section_titles: sectionTitles,
      evidence_snippets: evidenceSnippets,
      evidence_count: linkedEvidence.length,
      flags: [],
      validation_status: 'validated',
      review_reason: '',
      duplicate_group_key: '',
    }

    if (!candidate.raw_label) candidate.flags.push('missing_label')
    if (!candidate.raw_part_number) candidate.flags.push('missing_part_number')
    if (!candidate.source_kb_entity_ids.length) candidate.flags.push('missing_kb_entity')
    if (!candidate.evidence_count) candidate.flags.push('missing_evidence')
    if (!candidate.primary_source_page) candidate.flags.push('missing_source_page')
    if (!candidate.evidence_snippets.length) candidate.flags.push('missing_snippet')

    setStatus(candidate)
    candidates.push(candidate)
  }

  for (const entity of kbEntities) {
    const linkedEvidence = kbEvidenceByEntityId.get(entity.id) ?? []
    const sourcePages = dedupeStrings(linkedEvidence.map(ev => ev.source_page))
    const sectionTitles = dedupeStrings(linkedEvidence.map(ev => ev.section_title))
    const evidenceSnippets = dedupeStrings(linkedEvidence.map(ev => ev.evidence_snippet)).slice(0, 3)
    const rawLabel = normalizeText(entity.canonical_name)

    const candidate: CandidateRow = {
      validation_run_id: validationRunId,
      machine_id: machineId,
      organization_id: organizationId,
      source_part_id: null,
      source_kb_entity_ids: [entity.id],
      raw_label: rawLabel,
      normalized_label: normalizeLabel(rawLabel),
      raw_part_number: '',
      normalized_part_number: '',
      source_pages: sourcePages,
      primary_source_page: sourcePages[0] ?? '',
      section_titles: sectionTitles,
      evidence_snippets: evidenceSnippets,
      evidence_count: linkedEvidence.length,
      flags: ['orphan_kb_part_entity', 'missing_part_number'],
      validation_status: 'needs_review',
      review_reason: '',
      duplicate_group_key: '',
    }

    if (!candidate.primary_source_page) candidate.flags.push('missing_source_page')
    if (!candidate.evidence_snippets.length) candidate.flags.push('missing_snippet')

    setStatus(candidate)
    candidates.push(candidate)
  }

  const byPartNumber = new Map<string, CandidateRow[]>()
  const byLabel = new Map<string, CandidateRow[]>()

  for (const candidate of candidates) {
    if (candidate.normalized_part_number) {
      const bucket = byPartNumber.get(candidate.normalized_part_number) ?? []
      bucket.push(candidate)
      byPartNumber.set(candidate.normalized_part_number, bucket)
    }
    if (candidate.normalized_label) {
      const bucket = byLabel.get(candidate.normalized_label) ?? []
      bucket.push(candidate)
      byLabel.set(candidate.normalized_label, bucket)
    }
  }

  for (const [partNumber, rows] of byPartNumber) {
    const distinctLabels = [...new Set(rows.map(row => row.normalized_label).filter(Boolean))]
    if (distinctLabels.length > 1) {
      for (const row of rows) {
        row.flags.push('duplicate_part_number_conflict')
        row.duplicate_group_key = `pn:${partNumber}`
        setStatus(row)
      }
    }
  }

  for (const [label, rows] of byLabel) {
    const distinctPartNumbers = [...new Set(rows.map(row => row.normalized_part_number).filter(Boolean))]
    if (distinctPartNumbers.length > 1) {
      for (const row of rows) {
        row.flags.push('duplicate_label_multiple_numbers')
        if (!row.duplicate_group_key) row.duplicate_group_key = `label:${label}`
        setStatus(row)
      }
    }
  }

  const pageTextByNumber = new Map<string, string[]>()
  for (const chunk of manualChunks) {
    const page = String(chunk.page_number ?? '').trim()
    if (!page) continue
    const bucket = pageTextByNumber.get(page) ?? []
    bucket.push(normalizeText(chunk.chunk_text))
    pageTextByNumber.set(page, bucket)
  }

  const candidatesByPage = new Map<string, CandidateRow[]>()
  for (const candidate of candidates) {
    for (const page of candidate.source_pages) {
      const bucket = candidatesByPage.get(page) ?? []
      bucket.push(candidate)
      candidatesByPage.set(page, bucket)
    }
  }

  const pageCoverageRows: PageCoverageRow[] = []
  for (const [pageNumber, texts] of [...pageTextByNumber.entries()].sort((a, b) => Number(a[0]) - Number(b[0]))) {
    const pageText = texts.join('\n')
    const pageCandidates = candidatesByPage.get(pageNumber) ?? []
    const validatedCandidates = pageCandidates.filter(row => row.validation_status === 'validated')
    const partSignalScore = countPartSignals(pageText)

    let coverageStatus: PageCoverageRow['coverage_status'] = 'unknown'
    const flags: string[] = []

    if (pageCandidates.length > 0) {
      coverageStatus = 'covered'
      if (validatedCandidates.length === 0) flags.push('page_has_candidates_but_none_validated')
    } else if (partSignalScore > 0) {
      coverageStatus = 'needs_review'
      flags.push('parts_like_page_without_candidates')
    }

    pageCoverageRows.push({
      validation_run_id: validationRunId,
      machine_id: machineId,
      organization_id: organizationId,
      page_number: pageNumber,
      chunk_count: texts.length,
      part_signal_score: partSignalScore,
      candidate_count: pageCandidates.length,
      validated_candidate_count: validatedCandidates.length,
      coverage_status: coverageStatus,
      sample_snippet: pageText.slice(0, 240),
      flags,
    })
  }

  for (const rows of batch(candidates, 200)) {
    const { error } = await supabase.from('machine_part_candidates').insert(
      rows.map(row => ({
        ...row,
        source_kb_entity_ids: row.source_kb_entity_ids as unknown as Json,
        source_pages: row.source_pages as unknown as Json,
        section_titles: row.section_titles as unknown as Json,
        evidence_snippets: row.evidence_snippets as unknown as Json,
        flags: row.flags as unknown as Json,
      }))
    )

    if (error) {
      throw new Error(`machine_part_candidates insert failed: ${error.message}`)
    }
  }

  for (const rows of batch(pageCoverageRows, 200)) {
    const { error } = await supabase.from('machine_part_page_coverage').insert(
      rows.map(row => ({
        ...row,
        flags: row.flags as unknown as Json,
      }))
    )

    if (error) {
      throw new Error(`machine_part_page_coverage insert failed: ${error.message}`)
    }
  }

  const validatedParts = candidates.filter(row => row.validation_status === 'validated')
  const needsReviewParts = candidates.filter(row => row.validation_status === 'needs_review')
  const pagesNeedingReview = pageCoverageRows.filter(row => row.coverage_status === 'needs_review')

  const summary = {
    total_parts: candidates.length,
    validated_parts: validatedParts.length,
    needs_review_parts: needsReviewParts.length,
    pages_total: pageCoverageRows.length,
    pages_needing_review: pagesNeedingReview.length,
  }

  const { error: runUpdateError } = await supabase
    .from('machine_part_validation_runs')
    .update({
      status: 'completed',
      summary,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', validationRunId)

  if (runUpdateError) {
    throw new Error(`machine_part_validation_runs update failed: ${runUpdateError.message}`)
  }

  const exportDir = path.resolve(
    process.cwd(),
    'artifacts',
    'parts-validation',
    machineId,
    validationRunId
  )

  await fs.mkdir(exportDir, { recursive: true })

  await Promise.all([
    fs.writeFile(
      path.join(exportDir, 'validated_parts.csv'),
      toCsv(
        validatedParts.map(row => ({
          source_part_id: row.source_part_id,
          raw_label: row.raw_label,
          raw_part_number: row.raw_part_number,
          primary_source_page: row.primary_source_page,
          evidence_count: row.evidence_count,
          source_pages: row.source_pages,
          evidence_snippets: row.evidence_snippets,
        }))
      ),
      'utf8'
    ),
    fs.writeFile(
      path.join(exportDir, 'parts_review_queue.csv'),
      toCsv(
        needsReviewParts.map(row => ({
          source_part_id: row.source_part_id,
          raw_label: row.raw_label,
          raw_part_number: row.raw_part_number,
          primary_source_page: row.primary_source_page,
          evidence_count: row.evidence_count,
          flags: row.flags,
          review_reason: row.review_reason,
          source_pages: row.source_pages,
          evidence_snippets: row.evidence_snippets,
        }))
      ),
      'utf8'
    ),
    fs.writeFile(
      path.join(exportDir, 'parts_page_coverage.csv'),
      toCsv(
        pageCoverageRows.map(row => ({
          page_number: row.page_number,
          chunk_count: row.chunk_count,
          part_signal_score: row.part_signal_score,
          candidate_count: row.candidate_count,
          validated_candidate_count: row.validated_candidate_count,
          coverage_status: row.coverage_status,
          flags: row.flags,
          sample_snippet: row.sample_snippet,
        }))
      ),
      'utf8'
    ),
    fs.writeFile(
      path.join(exportDir, 'summary.json'),
      JSON.stringify(
        {
          validation_run_id: validationRunId,
          machine_id: machineId,
          organization_id: organizationId,
          ...summary,
          export_dir: exportDir,
        },
        null,
        2
      ),
      'utf8'
    ),
  ])

  console.log(
    JSON.stringify(
      {
        validation_run_id: validationRunId,
        machine_id: machineId,
        organization_id: organizationId,
        total_parts: summary.total_parts,
        validated_parts: summary.validated_parts,
        needs_review_parts: summary.needs_review_parts,
        pages_total: summary.pages_total,
        pages_needing_review: summary.pages_needing_review,
        export_dir: exportDir,
      },
      null,
      2
    )
  )
}

main().catch(async error => {
  console.error(error)
  process.exitCode = 1
})
