import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'AIzaSyBNoYS_M4FUIsiKH3mZyZ9sfv_PsnGoY6I');

/**
 * Generate 768-dimensional vector from Gemini
 */
export async function generateEmbeddings(text: string): Promise<number[]> {
    if (!process.env.GEMINI_API_KEY) {
        console.warn('GEMINI_API_KEY is missing. Using mock embedding for development.');
        return new Array(768).fill(0).map(() => Math.random());
    }
    const model = genAI.getGenerativeModel({ model: "gemini-embedding-001" });
    
    let retries = 3;
    while (retries > 0) {
        try {
            const result = await model.embedContent(text);
            return result.embedding.values;
        } catch (e: any) {
            if (e.status === 429 && retries > 1) {
                console.log(`⏳ Rate limited. Retrying in 2s... (${retries} left)`);
                await new Promise(resolve => setTimeout(resolve, 2000));
                retries--;
            } else {
                throw e;
            }
        }
    }
    throw new Error('Max retries exceeded for embeddings');
}

/**
 * Call Gemini Pro and force a JSON structure response
 */
export async function getGeminiStructuredResponse(prompt: string): Promise<any> {
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

    const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.2 // Low temp for deterministic diagnostics
        }
    });

    try {
        return JSON.parse(result.response.text());
    } catch (e) {
        console.error("Gemini did not return valid JSON", result.response.text());
        throw new Error("AI output parsing failed");
    }
}

/**
 * Technical Cleaning Phase: Identifies checklists and tables in raw text
 * to ensure they are preserved as atomic units during chunking.
 */
export async function cleanTechnicalText(text: string): Promise<string> {
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
    
    const prompt = `
        Tu es un expert en documentation technique industrielle. 
        Nettoie et structure le texte suivant extrait d'un PDF de manuel de maintenance.
        
        CONSIGNES :
        1. Identifie les TABLEAUX de maintenance et formate-les proprement (Markdown).
        2. Identifie les LISTES DE CONTRÔLE (checklists) et numérote-les.
        3. Préserve les numéros de pièces (Part Numbers) et les intervalles (ex: 500h).
        4. Supprime les bruits (en-têtes de page répétés, numéros de page isolés).
        5. Garde le texte technique intact, ne résume pas.

        TEXTE À NETTOYER :
        ---
        ${text}
        ---
    `;

    try {
        const result = await model.generateContent(prompt);
        return result.response.text();
    } catch (e) {
        console.warn('[Technical Cleaning Failed] Falling back to raw text', e);
        return text;
    }
}
