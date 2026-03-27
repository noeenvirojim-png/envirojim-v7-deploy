'use server';

import { GoogleGenerativeAI } from '@google/generative-ai';
import { extractErrorCodesFromImage } from './DiagnosticOCREngine';
import { getErrorCodeInfo } from './ErrorCodeLibrary';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUserFromSession } from '@/lib/auth-bridge';
import { normalizeSerialNumber } from '@/lib/normalization';

/**
 * MultimodalFusionEngine
 * Fuses Voice, Chat, and OCR data into a single, reassuring diagnostic.
 */
export async function getMultimodalDiagnostic(params: {
    machineId: string;
    voiceTranscript?: string;
    chatInput?: string;
    base64Image?: string;
}) {
    const { machineId: rawMachineId, voiceTranscript, chatInput, base64Image } = params;
    const supabase = createClient();
    const user = await getCurrentUserFromSession();
    
    // 0. Resolve Machine ID or SN (Dual-Resolution V7.2)
    let machineId = rawMachineId;
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawMachineId);

    const machineQuery = supabase.from('machines').select('id');
    if (isUUID) {
        machineQuery.eq('id', rawMachineId);
    } else {
        machineQuery.eq('serial_number', normalizeSerialNumber(rawMachineId));
    }

    const { data: machine } = await machineQuery.single();
    if (machine) {
        machineId = machine.id;
    } else {
        console.warn(`[FusionEngine] Machine not found for: ${rawMachineId}`);
    }

    // 1. Process OCR if image provided
    let ocrResult = null;
    let codeInfo = null;
    if (base64Image) {
        ocrResult = await extractErrorCodesFromImage(base64Image);
        if (ocrResult.codes && ocrResult.codes.length > 0) {
            // Take the first code for prioritized lookup
            codeInfo = await getErrorCodeInfo(ocrResult.manufacturer, ocrResult.codes[0]);
        }
    }

    // 2. Prepare context for Gemini
    const userContext = `
        Voix : "${voiceTranscript || 'N/A'}"
        Chat : "${chatInput || 'N/A'}"
        OCR Machine : ${JSON.stringify(ocrResult || 'N/A')}
        Détail Code Erreur : ${JSON.stringify(codeInfo || 'N/A')}
    `;

    if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY missing');
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
        Tu es l'Expert Diagnostic EnviroJim V7.
        Fusionne ces informations pour fournir un diagnostic PRO, RASSURANT et ORIENTÉ ACTION.
        
        CONTEXTE :
        ${userContext}
        
        RÈGLES CRITIQUES :
        - Ne jamais dire "panne", "défaillant" ou "non fiable".
        - Utiliser : "Voici ce que vous pouvez faire pour assurer le fonctionnement optimal..."
        - Être précis techniquement (utiliser les codes si présents).
        
        FORMAT SORTIE (Markdown) :
        ### [Diagnostic Récapitulatif]
        ### [Actions Correctives Suggérées]
        ### [Vérifications Complémentaires]
    `;

    try {
        const result = await model.generateContent(prompt);
        return {
            success: true,
            diagnostic: result.response.text(),
            ocrData: ocrResult,
            codeMatch: codeInfo
        };
    } catch (e: any) {
        console.error('[FusionEngine Error]', e);
        return { success: false, error: e.message };
    }
}

/**
 * Diagnostic Tree Logic (Yes/No Engine)
 * Manages the 5-step guided repair process.
 */
export async function getNextTreeStep(sessionId: string, answer: 'YES' | 'NO') {
    const supabase = createClient();
    
    // 1. Fetch current session
    const { data: session, error: fetchError } = await supabase
        .from('diagnostic_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();
        
    if (fetchError || !session) throw new Error('Session not found');

    // 2. Update history
    const newHistory = [...(session.history || []), { step: session.current_step, answer }];
    let nextStep = session.current_step + 1;
    let isResolved = answer === 'YES';
    let escalated = false;

    // 3. Check for escalation (Step 5 and still NO)
    if (nextStep > 5 && !isResolved) {
        escalated = true;
    }

    // 4. Persistence
    await supabase.from('diagnostic_sessions').update({
        current_step: nextStep,
        history: newHistory,
        is_resolved: isResolved,
        escalated: escalated
    }).eq('id', sessionId);

    // 5. Generate Next Question/Action via AI based on context
    // For the MVP, we use a simple logic or call AI to "invent" the next logical question
    return {
        step: nextStep,
        isResolved,
        escalated,
        question: await generateNextQuestion(session.machine_id, newHistory)
    };
}

async function generateNextQuestion(machineId: string, history: any[]) {
    // This would ideally call Gemini with the full machine manual context
    // Stub for now
    const questions = [
        "Veuillez identifier le symptôme principal.",
        "La machine démarre-t-elle ?",
        "Vérifiez l'alimentation batterie. Les bornes sont-elles propres ?",
        "Y a-t-il un message d'erreur sur l'écran ?",
        "Vérifiez le niveau d'huile moteur. Est-il correct ?",
        "Pour assurer une résolution rapide, vous pouvez contacter votre dealer."
    ];
    return questions[history.length] || questions[5];
}
