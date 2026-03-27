'use server';

import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUserFromSession } from '@/lib/auth-bridge';

/**
 * WorkOrderEngine
 * Processes technician dictations and generates structured reports.
 */
export async function processWorkOrderDictation(rawSpeech: string) {
    if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY missing');
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
        Tu es l'Expert Report Manager EnviroJim.
        Transforme cette dictée de technicien en un rapport d'intervention professionnel, structuré et clair.
        
        DICTÉE : "${rawSpeech}"
        
        STRUCTURE ATTENDUE (JSON) :
        {
            "problem": "Résumé du problème initial",
            "diagnostic": "Résultat de l'analyse",
            "actions": ["Action 1", "Action 2"],
            "results": "État final de la machine",
            "times": {
                "intervention": "Minutes estimées"
            }
        }
    `;

    try {
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        return jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    } catch (e) {
        console.error('[WorkOrderDictation Error]', e);
        return null;
    }
}

/**
 * Smart Photo Tagging
 * Automatically captions technician photos using AI.
 */
export async function tagInterventionPhoto(base64Image: string) {
    if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY missing');
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = "Décris cette photo d'intervention mécanique en 5-7 mots. Sois précis (ex: 'Connexion capteur après intervention').";

    try {
        const result = await model.generateContent([
            prompt,
            { inlineData: { data: base64Image.split(',')[1] || base64Image, mimeType: "image/jpeg" } }
        ]);
        return result.response.text().trim();
    } catch (e) {
        return "Photo d'intervention";
    }
}
