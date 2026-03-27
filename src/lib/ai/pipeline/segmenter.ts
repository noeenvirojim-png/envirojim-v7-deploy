import { GoogleGenerativeAI } from '@google/generative-ai'

export const SegmenterService = {
  async segmentText(textContent: string): Promise<{
    chunks: { title: string; type: 'procedure' | 'part' | 'fault' | 'maintenance' | 'spec' | 'general'; content: string; page_context?: string }[]
  }> {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

    const prompt = `Segment machine manual text into logical blocks.
Categories: procedure, part, fault, maintenance, spec, general.
Text: ${textContent.substring(0, 40000)}
Return JSON: { "chunks": [{ "title": "Section Title", "type": "type", "content": "RawText", "page_context": "Page X" }] }`

    const result = await model.generateContent(prompt)
    try {
      const resp = result.response.text()
      return JSON.parse(resp.match(/\{[\s\S]*\}/)?.[0] ?? '{"chunks":[]}')
    } catch {
      return { chunks: [{ title: 'Full Text', type: 'general', content: textContent }] }
    }
  },
}
