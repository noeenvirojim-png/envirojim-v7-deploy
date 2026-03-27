import { createClient } from '@/lib/supabase/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

export const DiagnosticEngine = {
  async runDiagnosis(machineId: string, symptoms: string) {
    const supabase = createClient()
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' })

    // RAG: Fetch relevant machine knowledge
    const { data: knowledge } = await supabase
      .from('document_chunks')
      .select('raw_text, section_title')
      .eq('machine_id', machineId)
      .limit(10)

    const contextText = knowledge?.map(k => `[${k.section_title}] ${k.raw_text}`).join('\n\n')

    const prompt = `Système Diagnostic IA EnviroJim.
Symptômes: "${symptoms}"
Base de connaissance:
${contextText}

Proposer une analyse JSON: { "assessment": "...", "causes": [], "recommendations": [], "confidence": 0.XX }`

    const result = await model.generateContent(prompt)
    const diagnosis = JSON.parse(result.response.text().match(/\{[\s\S]*\}/)?.[0] ?? '{}')

    const { data: { user } } = await supabase.auth.getUser()
    const { data: machine } = await supabase.from('machines').select('organization_id').eq('id', machineId).single()

    const { data: session } = await supabase.from('diagnostic_sessions').insert({
      machine_id: machineId,
      organization_id: machine?.organization_id,
      created_by: user?.id,
      symptoms_input: { text: symptoms },
      ai_assessment: diagnosis,
      confidence: diagnosis.confidence ?? 0.5
    }).select('id').single()

    return { diagnosis, sessionId: session?.id }
  },
}
