'use server';

import { GoogleGenerativeAI } from '@google/generative-ai';

export async function processVoiceNote(voiceNoteUrl: string) {
    if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY missing');
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Mocking transcription from URL for the stub
    const rawTranscription = "On a vérifié les courroies et tout semble bon mais il y a un peu de jeu dans le bolt convoyeur donc on l'a resserré.";

    const prompt = `
        Tu es l'Expert Maintenance EnviroJim.
        Note du technicien : "${rawTranscription}"
        
        Tache :
        Reformate cette note en un rapport technique clair et professionnel pour le suivi d'intervention.
        Enlève les répétitions et structure le texte.
    `;

    try {
        const result = await model.generateContent(prompt);
        return result.response.text().trim();
    } catch (e: any) {
        console.error('[processVoiceNote Error]', e);
        return rawTranscription;
    }
}
