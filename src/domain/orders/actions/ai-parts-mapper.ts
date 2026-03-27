'use server';

import { createClient } from '@/lib/supabase/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getCurrentUserFromSession } from '@/lib/auth-bridge';

export async function mapFuzzyPartToCatalog(description: string, machineId?: string) {
    const user = await getCurrentUserFromSession();
    if (!user) throw new Error('Unauthorized');
    const supabase = createClient();

    // 1. Fetch relevant catalog context
    const { data: catalog } = await supabase.from('parts_catalog').select('*').limit(50);
    
    if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY missing');
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash", generationConfig: { responseMimeType: "application/json" } });

    const prompt = `
        Tu es l'Expert Inventaire EnviroJim.
        Description utilisateur : "${description}"
        
        CATALOGUE :
        ${JSON.stringify(catalog)}
        
        TACHE :
        1. Identifie la pièce la plus probable dans le catalogue.
        2. Si aucune correspondance exacte, suggère une création.
        
        JSON STRICT :
        {
            "match_found": boolean,
            "part_catalog_id": "UUID or null",
            "confidence": 0-100,
            "reasoning": "string"
        }
    `;

    try {
        const result = await model.generateContent(prompt);
        return JSON.parse(result.response.text());
    } catch (e: any) {
        console.error('[mapFuzzyPartToCatalog Error]', e);
        return { match_found: false, part_catalog_id: null, confidence: 0, reasoning: 'AI Error' };
    }
}
