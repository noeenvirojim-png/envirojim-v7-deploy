import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Google Gemini Integration Layer
 * Uses 'gemini-1.5-pro' for complex reasoning and 'gemini-1.5-flash' for faster tasks.
 */

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'mock-key');

export async function analyzeManual(textContent: string) {
  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'mock-key') {
    console.warn('Gemini API key missing, returning mock data');
    return { interval_hours: 250, items: ["Check engine oil", "Inspect air filter", "Grease joints"] };
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
    const prompt = `
            Analyze this machine manual text. 
            Extract the maintenance schedule into a JSON format. 
            Text: ${textContent.substring(0, 30000)}
            
            Return ONLY a JSON object:
            {
              "interval_hours": number,
              "items": string[]
            }
        `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Extract JSON from markdown code blocks if present
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return JSON.parse(text);
  } catch (error) {
    console.error('Gemini analysis error:', error);
    return { error: "Failed to analyze manual" };
  }
}

export async function interpretVoiceCommand(transcript: string) {
  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'mock-key') {
    console.warn('Gemini API key missing, returning default intent');
    if (transcript.toLowerCase().includes('alternat')) {
      return { intent: 'PARTS_SEARCH', entities: ['Alternator'] };
    }
    return { intent: 'UNKNOWN', entities: [] };
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `
            Act as a semantic router for a heavy machinery maintenance app.
            Analyze the following transcript: "${transcript}"
            
            Determine the user's intent from this list: [PARTS_SEARCH, DIAGNOSIS_START, VIEW_DOCUMENTS, CALL_SUPPORT, UNKNOWN].
            Extract relevant entities (part names, machine models).
            
            Return ONLY a JSON object:
            {
              "intent": "INTENT_NAME",
              "entities": ["entity1", "entity2"]
            }
        `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return JSON.parse(text);
  } catch (error) {
    console.error('Gemini interpretation error:', error);
    return { intent: 'UNKNOWN', entities: [] };
  }
}
