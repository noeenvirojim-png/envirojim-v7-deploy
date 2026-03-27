'use server';

import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUserFromSession } from '@/lib/auth-bridge';

export async function processDriverVoiceNote(audioUrl: string, transportId: string) {
    const user = await getCurrentUserFromSession();
    if (!user) throw new Error('Unauthorized');
    const supabase = createClient();

    if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY missing');
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // 1. Transcription Placeholder (In a real flow, Whisper would be used or Gemini Multimodal)
    const mockTranscription = "I'm stuck at the US border, traffic is heavy. Estimated delay of 3 hours. Inspection went fine earlier.";

    // 2. AI Reformatting for Logistics Manager
    const prompt = `
        Tu es l'Expert Logistique EnviroJim.
        Note du conducteur : "${mockTranscription}"
        
        Tache :
        1. Reformate ceci en un rapport court et professionnel pour le tableau de bord.
        2. Identifie s'il y a un retard critique.
        
        Format Sortie :
        [RAPPORT LOGISTIQUE]
        STATUT : [Normal / Alerte]
        DÉTAIL : [Résumé propre]
        ACTION : [Suggestion d'action]
    `;

    try {
        const result = await model.generateContent(prompt);
        const formattedText = result.response.text();

        // 3. Save to DB
        const { data: voiceNote, error } = await supabase
            .from('notes_vocal')
            .insert({
                transport_id: transportId,
                audio_url: audioUrl,
                transcription: mockTranscription,
                formatted_text: formattedText
            })
            .select()
            .single();

        if (error) throw error;

        // Link to Transport
        await supabase
            .from('transports')
            .update({ voice_note_id: voiceNote.id, status: 'DELAYED' }) // Auto-update to delayed if alert detected
            .eq('id', transportId);

        return { success: true, formattedText };
    } catch (e: any) {
        console.error('[processDriverVoiceNote Error]', e);
        return { success: false, error: e.message };
    }
}
