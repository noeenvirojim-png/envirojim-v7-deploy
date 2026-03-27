'use server';

import { GoogleGenerativeAI } from '@google/generative-ai';
import { fetchFullOperationalData } from './HistoricalDataFetcher';

export async function generateAiInsights() {
    const data = await fetchFullOperationalData();
    
    if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY missing');
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash", generationConfig: { responseMimeType: "application/json" } });

    const prompt = `
        Tu es le Chief Data Officer de EnviroJim V7.2.
        Données opérationnelles : ${JSON.stringify({
            machines: data.machines.length,
            maintenance_critical: data.maintenance.filter(m => m.alert_level === 'CRITICAL').map(m => m.machine?.serial_number),
            parts_delayed: data.parts.filter(p => p.internal_status === 'ORDER_TRANSMITTED').length,
            transports_delayed: data.transports.filter(t => t.status === 'DELAYED').length
        })}
        
        Tache :
        1. Identifie les 3 principales tendances opérationnelles.
        2. Prédit les risques majeurs pour la semaine prochaine.
        3. Suggère 2 optimisations immédiates.
        
        DISCLAIMER OBLIGATOIRE : "Les recommandations de l'IA doivent être validées par un humain."
        
        JSON STRICT :
        {
            "insights": [
                {"title": "string", "description": "string", "severity": "LOW/MEDIUM/HIGH"}
            ],
            "predictions": [
                {"event": "string", "probability": "string", "impact": "string"}
            ],
            "disclaimer": "string"
        }
    `;

    try {
        const result = await model.generateContent(prompt);
        return JSON.parse(result.response.text());
    } catch (e: any) {
        console.error('[generateAiInsights Error]', e);
        return { insights: [], predictions: [], disclaimer: "Erreur IA - Validation humaine requise." };
    }
}
