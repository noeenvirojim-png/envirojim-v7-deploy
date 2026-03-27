import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

type ChunkInput = {
  type: string
  content: string
  title: string
  page_number?: number | null
}

type ProcedureCandidate = {
  title: string
  description: string
  trigger: string
  interval_text: string
  steps: string[]
  confidence: number
}

function normalizeLine(line: string): string {
  return line
    .replace(/\s+/g, ' ')
    .replace(/^[•\-–—*\d.)\s]+/, '')
    .trim()
}

function dedupeStrings(values: string[]): string[] {
  return [...new Set(values.map(v => v.trim()).filter(Boolean))]
}

function inferProcedureTitle(line: string): string {
  const cleaned = normalizeLine(line)
  if (!cleaned) return 'Procédure extraite'
  if (cleaned.length <= 80) return cleaned
  return cleaned.slice(0, 77).trim() + '...'
}

function extractProcedureCandidatesHeuristic(chunk: ChunkInput): ProcedureCandidate[] {
  const raw = chunk.content || ''
  const lines = raw
    .split(/\r?\n/)
    .map(normalizeLine)
    .filter(Boolean)

  const procedureSignals = [
    /entretien/i,
    /contr[oô]ler/i,
    /contr[ôo]le/i,
    /resserrer/i,
    /v[ée]rifier/i,
    /v[ée]rification/i,
    /graisser/i,
    /lubrifier/i,
    /nettoyer/i,
    /remplacer/i,
    /changer/i,
    /vidange/i,
    /monter/i,
    /d[ée]monter/i,
    /r[ée]gler/i,
    /inspecter/i,
    /rodage/i,
    /apr[èe]s les premi[èe]res/i,
    /toutes les \d+/i,
    /tous les \d+/i,
    /\b\d+\s*h\b/i,
    /\bquotidien\b/i,
    /\bhebdomadaire\b/i,
    /\bmensuel\b/i
  ]

  const matchedLines = lines.filter(line => procedureSignals.some(rx => rx.test(line)))

  const grouped: string[] = []
  let buffer: string[] = []

  for (const line of matchedLines) {
    if (buffer.length === 0) {
      buffer.push(line)
      continue
    }

    const startsNew =
      /^(contr[oô]ler|v[ée]rifier|resserrer|graisser|lubrifier|nettoyer|remplacer|changer|vidange|inspecter|r[ée]gler|apr[èe]s|toutes?|quotidien|hebdomadaire|mensuel)/i.test(line)

    if (startsNew) {
      grouped.push(buffer.join(' '))
      buffer = [line]
    } else {
      buffer.push(line)
    }
  }

  if (buffer.length) grouped.push(buffer.join(' '))

  const candidates = grouped.map(text => {
    const steps = dedupeStrings(
      text
        .split(/(?:\.\s+|;\s+|\|\s+|,\s+(?=[A-ZÀ-ÖØ-Þa-zà-öø-ÿ]))/)
        .map(normalizeLine)
        .filter(Boolean)
    )

    const intervalMatch =
      text.match(/(apr[èe]s les premi[èe]res\s+\d+\s*h)/i) ||
      text.match(/(toutes?\s+les?\s+\d+\s*h)/i) ||
      text.match(/(tous?\s+les?\s+\d+\s*h)/i) ||
      text.match(/(\bquotidien\b|\bhebdomadaire\b|\bmensuel\b)/i)

    const trigger =
      /rodage|apr[èe]s les premi[èe]res/i.test(text) ? 'rodage/entretien initial' : ''

    return {
      title: inferProcedureTitle(steps[0] || text),
      description: text,
      trigger,
      interval_text: intervalMatch ? intervalMatch[1] : '',
      steps: steps.slice(0, 8),
      confidence: 0.72
    }
  })

  return candidates.filter(c => c.title && c.description).slice(0, 12)
}

function parseGeminiJsonArray(raw: string): any[] {
  const cleaned = String(raw || '')
    .replace(/```json/gi, '```')
    .replace(/```/g, '')
    .trim()

  const candidates: string[] = [cleaned]

  const arrayMatch = cleaned.match(/\[[\s\S]*\]/)
  if (arrayMatch) candidates.push(arrayMatch[0])

  const objectMatch = cleaned.match(/\{[\s\S]*\}/)
  if (objectMatch) candidates.push(objectMatch[0])

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate)
      if (Array.isArray(parsed)) return parsed
      if (parsed && Array.isArray(parsed.items)) return parsed.items
      if (parsed && Array.isArray(parsed.results)) return parsed.results
      if (parsed && Array.isArray(parsed.data)) return parsed.data
      if (parsed && typeof parsed === 'object' && Object.keys(parsed).length === 0) return []
    } catch {}
  }

  return []
}

function buildExtractionPrompt(entityType: 'part' | 'procedure' | 'fault', chunk: ChunkInput): string {
  const common = `Tu extrais des informations techniques d'un manuel de machine industrielle. Réponds UNIQUEMENT en JSON valide. AUCUN markdown. AUCUN texte avant ou après. Si rien n'est trouvé, réponds [].

Contexte:
- title: ${JSON.stringify(chunk.title || '')}
- page_number: ${JSON.stringify(chunk.page_number ?? null)}

Texte source:
${chunk.content}`

  if (entityType === 'part') {
    return `${common}

Format JSON attendu:
[
  {
    "name": "string",
    "canonical_part_number": "string",
    "description": "string",
    "confidence": 0.0
  }
]

Règles:
- Extraire uniquement de vraies pièces/composants
- confidence entre 0 et 1
- pas de doublons`
  }

  if (entityType === 'procedure') {
    return `${common}

Extrais uniquement de vraies procédures / opérations d'entretien / instructions opératoires.

Format JSON attendu:
[
  {
    "title": "string",
    "description": "string",
    "trigger": "string",
    "interval_text": "string",
    "steps": ["string"],
    "confidence": 0.0
  }
]

Règles:
- Une procédure = une vraie action structurée à réaliser
- title court et spécifique
- steps = liste de phrases courtes, [] si absentes
- interval_text = fréquence si présente (ex: "après les premières 50 h", "toutes les 250 h"), sinon ""
- trigger = condition de déclenchement si présente, sinon ""
- confidence entre 0 et 1
- si rien de procédural n'est présent, répondre []`
  }

  return `${common}

Extrais uniquement de vrais cas de panne / symptômes / causes / actions correctives.

Format JSON attendu:
[
  {
    "symptom": "string",
    "cause": "string",
    "corrective_action": "string",
    "severity": "low|medium|high|unknown",
    "confidence": 0.0
  }
]

Règles:
- Un fault = symptôme/problème exploitable
- corrective_action = action recommandée si présente, sinon ""
- cause = cause probable si présente, sinon ""
- severity = low/medium/high/unknown
- confidence entre 0 et 1
- si rien n'est trouvé, répondre []`
}

export const ExtractorService = {
  async extractFromChunk(machineId: string, chunk: { type: string; content: string; title: string; page_number?: number | null }, kbId?: string, organizationId?: string, runId?: string) {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
    const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' })
    const supabase = createClient()
    const adminClient = createAdminClient()

    const entityType = chunk.type as 'part' | 'procedure' | 'fault'
    const prompt = buildExtractionPrompt(entityType, chunk)

    try {
      const result = await model.generateContent(prompt)
      const responseText = result.response.text()
      const parsedData = parseGeminiJsonArray(responseText)

      if (entityType === 'part' && Array.isArray(parsedData)) {
        for (const p of parsedData) {
          const { data: partData } = await supabase.from('parts').upsert({
            machine_id: machineId,
            canonical_part_number: p.canonical_part_number || p.p_num || p.name,
            name: p.name,
            source_confidence: p.confidence ?? 0.9,
            source_refs: [{ doc_chunk_title: chunk.title, snippet: chunk.content?.substring(0, 200), page: chunk.page_number }]
          }, { onConflict: 'machine_id,canonical_part_number' }).select('id').maybeSingle()

          if (partData?.id) {
            console.log(`📌 Creating evidence for part: ${p.name}, page: ${chunk.page_number}`)
            await this.createEvidenceForEntity({
              adminClient,
              kbId,
              runId,
              organizationId,
              machineId,
              entityType: 'part',
              entityLabel: p.name,
              entitySourceId: partData.id,
              chunk
            })
          }
        }
      }

      if (entityType === 'procedure') {
        let procedures = parseGeminiJsonArray(responseText) as ProcedureCandidate[]

        if (!procedures.length) {
          console.log(`[Procedure] Gemini returned empty, using heuristic fallback`)
          procedures = extractProcedureCandidatesHeuristic(chunk)
        }

        for (const proc of procedures) {
          const title = String(proc.title || '').trim()
          const description = String(proc.description || '').trim()
          if (!title || !description) continue

          const steps = Array.isArray(proc.steps) ? proc.steps.filter(Boolean) : []
          const sourcePage = chunk.page_number ?? 1
          const sourceConfidence = proc.confidence ?? 0.72

          const { data: procedureData, error: procedureError } = await supabase
            .from('procedures')
            .insert({
              machine_id: machineId,
              title,
              category: 'preventive',
              ordered_steps: steps,
              preconditions: proc.trigger || null,
              tools_required: [],
              warnings: [],
              estimated_duration: proc.interval_text || null,
              source_confidence: sourceConfidence,
              source_refs: [{ page: sourcePage, chunk_title: chunk.title, snippet: description.substring(0, 200) }]
            })
            .select('id,title')
            .single()

          if (procedureError || !procedureData) {
            console.warn('[Procedure insert error]', procedureError?.message)
            continue
          }

          console.log(`📌 Creating evidence for procedure: ${procedureData.title}, page: ${sourcePage}`)
          await this.createEvidenceForEntity({
            adminClient,
            kbId,
            runId,
            organizationId,
            machineId,
            entityType: 'procedure',
            entityLabel: procedureData.title || title,
            entitySourceId: procedureData.id,
            chunk
          })
        }

        return { success: true }
      }

      if (entityType === 'fault' && Array.isArray(parsedData)) {
        for (const fault of parsedData) {
          console.log(`📌 Creating evidence for fault: ${fault.symptom}, page: ${chunk.page_number}`)
          await this.createEvidenceForEntity({
            adminClient,
            kbId,
            runId,
            organizationId,
            machineId,
            entityType: 'fault_case',
            entityLabel: fault.symptom,
            entitySourceId: null,
            chunk
          })
        }
      }

      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  },

  async createEvidenceForEntity(params: {
    adminClient: any
    kbId?: string
    runId?: string
    organizationId?: string
    machineId: string
    entityType: string
    entityLabel: string
    entitySourceId?: string | null
    chunk: { title: string; content: string; page_number?: number | null }
  }) {
    try {
      const { adminClient, kbId, runId, organizationId, machineId, entityType, entityLabel, chunk } = params

      const snippet = (chunk.content || '').substring(0, 500)
      const sourcePage = String(chunk.page_number ?? 1)

      if (!kbId || !organizationId || !runId) {
        console.warn(`[EvidenceDebug] Missing params for ${entityType}: kbId=${kbId}, orgId=${organizationId}, runId=${runId}`)
        return
      }

      const { data: entityData, error: entityError } = await adminClient.from('machine_kb_entities').insert({
        kb_id: kbId,
        run_id: runId,
        machine_id: machineId,
        organization_id: organizationId,
        entity_type: entityType,
        canonical_name: entityLabel,
        original_label: entityLabel,
        source_page: sourcePage,
        evidence_snippet: snippet,
        language: 'en',
        confidence: 'high'
      }).select('id').single()

      if (!entityData?.id) {
        console.warn(`[EvidenceDebug] Entity creation failed for ${entityType}`)
        return
      }

      const evRes = await adminClient.from('machine_kb_evidence').insert({
        entity_id: entityData.id,
        kb_id: kbId,
        machine_id: machineId,
        organization_id: organizationId,
        source_file_name: 'extraction',
        source_page: sourcePage,
        evidence_snippet: snippet,
        language: 'en',
        confidence: 'high'
      })

      if (evRes.error) {
        console.warn(`[EvidenceDebug] Evidence insert error for ${entityType}: ${evRes.error.message}`)
      }
    } catch (err: any) {
      console.warn(`[EvidenceDebug] Evidence creation error for ${entityType}:`, err.message)
    }
  }
}
