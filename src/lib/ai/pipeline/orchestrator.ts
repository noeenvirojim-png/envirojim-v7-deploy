import { createClient } from '@/lib/supabase/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { getCurrentUserFromSession } from '@/lib/auth-bridge'
import { SegmenterService } from './segmenter'
import { ExtractorService } from './extractor'
import { FusionService } from './fuser'

export const PipelineOrchestrator = {
  async processDocument(machineId: string, docId: string, textContent: string) {
    const supabase = createClient()

    try {
      await supabase.from('machine_documents').update({ processing_status: 'processing' }).eq('id', docId)

      const { chunks } = await SegmenterService.segmentText(textContent)

      for (const chunk of chunks) {
        await ExtractorService.extractFromChunk(machineId, chunk)

        // PERSISTENCE: section_title matches document_chunks (SQL V9 line 182)
        await supabase.from('document_chunks').insert({
          machine_id: machineId,
          document_id: docId,
          chunk_type: chunk.type,
          raw_text: chunk.content,
          section_title: chunk.title,
          page_from: parseInt(chunk.page_context?.match(/\d+/)?.[0] ?? '1'),
          page_to: parseInt(chunk.page_context?.match(/(\d+)(?!.*\d)/)?.[0] ?? '1'),
        })
      }

      await FusionService.consolidateMachineKnowledge(machineId)
      await supabase.from('machine_documents').update({ processing_status: 'completed' }).eq('id', docId)
      return { success: true }
    } catch (err: any) {
      await supabase.from('machine_documents').update({ processing_status: 'failed' }).eq('id', docId)
      return { success: false, error: err.message }
    }
  },

  async extractPartRequest(machineId: string, query: string) {
    const user = await getCurrentUserFromSession()
    if (!user) throw new Error('Unauthorized')

    const supabase = createClient()
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: { responseMimeType: 'application/json' },
    })

    // Uses 'parts' table (no parts_catalog in V9 schema)
    const { data: catalog } = await supabase.from('parts').select('id, name, canonical_part_number').eq('machine_id', machineId)

    const prompt = `Analyste Logistique EnviroJim. Demande: "${query}"
Machine ID: ${machineId}
Catalogue Pièces: ${JSON.stringify(catalog ?? [])}
JSON: { "urgency": "normal|high", "items": [{"partId": "uuid", "name": "string", "qty": number, "p_num": "string"}] }`

    const result = await model.generateContent(prompt)
    const extracted = JSON.parse(result.response.text())

    // part_orders has no urgency (SQL V9 line 321)
    const { data: order, error: orderErr } = await supabase.from('part_orders').insert({
      machine_id: machineId,
      organization_id: user.organization_id,
      created_by: user.id,
      status: 'draft',
      currency: 'CAD',
      total: 0
    }).select('id').single()

    if (orderErr) throw orderErr

    // urgency is in part_order_items (SQL V9 line 351)
    const items = extracted.items.map((item: any) => ({
      part_order_id: order.id,
      part_id: item.partId,
      part_number: item.p_num ?? item.name,
      quantity: item.qty,
      urgency: extracted.urgency ?? 'normal'
    }))

    await supabase.from('part_order_items').insert(items)
    return { success: true, orderId: order.id }
  },
}
