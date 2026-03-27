'use server';

import { createClient } from '@/lib/supabase/server';
import { getCurrentUserFromSession } from '@/lib/auth-bridge';
import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * AI Guidance Services V8
 * Handles structured navigation, session persistence, and safety hardening.
 */

export interface GuidanceSession {
    id: string;
    machine_id: string;
    session_type: 'diagnostic' | 'training' | 'procedure';
    current_step: string;
    session_state_json: any;
    completed: boolean;
}

export async function startGuidanceSession(machineId: string, type: 'diagnostic' | 'training' | 'procedure', symptom?: string) {
    const user = await getCurrentUserFromSession();
    if (!user) throw new Error('Unauthorized');

    const supabase = createClient();

    const { data, error } = await supabase.from('guidance_sessions').insert({
        user_id: user.id,
        machine_id: machineId,
        session_type: type,
        current_step: 'START',
        session_state_json: { symptom, startTime: new Date().toISOString() }
    }).select().single();

    if (error) throw error;
    return { success: true, session: data };
}

export async function advanceDiagnosticStep(sessionId: string, answer: 'YES' | 'NO') {
    const supabase = createClient();

    const { data: session } = await supabase.from('guidance_sessions').select('*').eq('id', sessionId).single();
    if (!session) throw new Error('Session not found');

    const { data: tree } = await supabase.from('diagnostic_trees')
        .select('*')
        .eq('machine_id', session.machine_id)
        .eq('symptom', session.session_state_json.symptom)
        .order('tree_version', { ascending: false })
        .limit(1)
        .single();

    if (!tree) {
        // Fallback to RAG if no tree found
        return handleRAGFallback(session, answer);
    }

    const currentStepId = session.current_step === 'START' ? 'root' : session.current_step;
    const currentNode = tree.tree_structure_json[currentStepId];

    if (!currentNode) throw new Error('Invalid step ID');

    const nextStepId = answer === 'YES' ? currentNode.next_step_yes : currentNode.next_step_no;

    if (nextStepId === 'RESULT_SUCCESS' || nextStepId === 'RESULT_FAILURE') {
        await supabase.from('guidance_sessions').update({
            current_step: nextStepId,
            completed: true,
            session_state_json: { ...session.session_state_json, final_cause: currentNode.probable_cause }
        }).eq('id', sessionId);
        
        // Log to repair history if success
        if (nextStepId === 'RESULT_SUCCESS') {
            await logSuccessfulRepair(session, currentNode.probable_cause, tree.confidence_score);
        }

        return { success: true, isFinal: true, result: nextStepId, cause: currentNode.probable_cause };
    }

    await supabase.from('guidance_sessions').update({
        current_step: nextStepId
    }).eq('id', sessionId);

    return { success: true, isFinal: false, nextStep: tree.tree_structure_json[nextStepId] };
}

async function handleRAGFallback(session: any, lastAnswer: string) {
    const supabase = createClient();
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    const model = genAI.getGenerativeModel({ 
        model: "gemini-1.5-pro",
        generationConfig: { responseMimeType: "application/json" }
    });

    // 1. Fetch Context
    const [{ data: docs }, { data: procedures }] = await Promise.all([
        supabase.from('documents').select('title, content_summary').eq('machine_id', session.machine_id).limit(10),
        supabase.from('procedures').select('title, ordered_steps').eq('machine_id', session.machine_id).limit(5)
    ]);

    const prompt = `
        Tu es l'Expert Diagnostic EnviroJim. Session ID: ${session.id}
        Symptôme: ${session.session_state_json.symptom}
        Réponse précédente: ${lastAnswer}
        
        CONTEXTE TECHNIQUE (RAG):
        Documents: ${JSON.stringify(docs || [])}
        Procédures: ${JSON.stringify(procedures || [])}
        
        Tâche:
        Génère la prochaine étape de diagnostic. Cite tes sources précisément (titre du document).
        
        {
            "instruction": "Action précise à effectuer",
            "question": "Question fermée (OUI/NON)",
            "confidence": 0.95,
            "citations": ["Titre du manuel - Section X"]
        }
    `;

    try {
        const result = await model.generateContent(prompt);
        const guidance = JSON.parse(result.response.text());

        return { success: true, isFallback: true, guidance };
    } catch (err) {
        console.error('[DIAGNOSTIC] RAG Fallback failed:', err);
        return { success: false, error: 'AI reasoning failure' };
    }
}

async function logSuccessfulRepair(session: any, cause: string, confidence: number) {
    const supabase = createClient();
    await supabase.from('repair_history').insert({
        machine_id: session.machine_id,
        technician_id: session.user_id,
        reported_symptom: session.session_state_json.symptom,
        diagnosed_cause: cause,
        repair_success: true
    });
    
    // Trigger self-learning engine analysis
    // (In a real app, this might be a background job)
}
