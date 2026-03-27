import crypto from 'crypto'
import { createClient } from '@/lib/supabase/server'

export const IngestionService = {
  computeHash(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex')
  },

  async ingestDocuments(machineId: string, files: { filename: string; storagePath: string; contentHash: string }[]) {
    const supabase = createClient()
    const results = []

    for (const file of files) {
      try {
        const { data: existing } = await supabase
          .from('machine_documents')
          .select('id')
          .eq('machine_id', machineId)
          .eq('source_hash', file.contentHash)
          .maybeSingle()

        if (existing) {
          results.push({ success: true, documentId: existing.id, status: 'SKIPPED_DUPLICATE' })
          continue
        }

        const { data: doc, error } = await supabase
          .from('machine_documents')
          .insert({
            machine_id: machineId,
            storage_path: file.storagePath,
            filename: file.filename,
            source_hash: file.contentHash,
            processing_status: 'uploaded',
            document_type: 'other'
          })
          .select('id')
          .single()

        if (error) throw error
        results.push({ success: true, documentId: doc.id, status: 'INGESTED' })
      } catch (err: any) {
        results.push({ success: false, error: err.message })
      }
    }
    return results
  },
}
