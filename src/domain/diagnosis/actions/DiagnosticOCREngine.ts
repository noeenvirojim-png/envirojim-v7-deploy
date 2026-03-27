'use server';

import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * DiagnosticOCREngine
 * Uses Gemini 1.5 Flash Vision to extract error codes and status from machine screen photos.
 */
export async function extractErrorCodesFromImage(base64Image: string) {
    if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY missing');
    
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
        Tu es l'Expert Vision Industrielle EnviroJim.
        Analyse cette photo d'un écran de contrôle de machine (CAT, Volvo ou Cummins).
        
        Tache :
        1. Extrais TOUS les codes d'erreurs visibles (ex: SPN 523602 FMI 7, E324, etc.).
        2. Identifie le fabricant si possible.
        3. Résume l'état visuel de l'écran (voyants allumés, messages d'alerte).
        
        IMPORTANT : Fournis un résultat structuré en JSON.
        Format attendu :
        {
            "manufacturer": "CAT | VOLVO | CUMMINS | UNKNOWN",
            "codes": ["CODE1", "CODE2"],
            "screenStatus": "Description courte",
            "confidence": 0-100
        }
    `;

    try {
        const result = await model.generateContent([
            prompt,
            {
                inlineData: {
                    data: base64Image.split(',')[1] || base64Image,
                    mimeType: "image/jpeg"
                }
            }
        ]);

        const text = result.response.text();
        // Extract JSON from potential markdown blocks
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
        return { manufacturer: "UNKNOWN", codes: [], screenStatus: text, confidence: 50 };
    } catch (e: any) {
        console.error('[DiagnosticOCREngine Error]', e);
        return { error: e.message };
    }
}
