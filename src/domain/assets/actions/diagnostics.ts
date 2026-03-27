'use server';

import { createClient } from '@/lib/supabase/server';
import { getCurrentUserFromSession } from '@/lib/auth-bridge';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';

const DiagnosticQuerySchema = z.object({
    machine_id: z.string().uuid(),
    query: z.string().min(1),
});

export interface DiagnosticResult {
    assessment: string;
    potential_causes: {
        cause: string;
        confidence: number;
        evidence: string;
    }[];
    next_steps: string[];
    linked_procedures?: string[];
    linked_parts?: string[];
    client_facing_message: string;
}

export async function getDiagnosticAnalysis(data: { machine_id: string, query: string }): Promise<{ success: boolean; result?: DiagnosticResult; error?: string }> {
    const user = await getCurrentUserFromSession();
    if (!user) return { success: false, error: 'Unauthorized' };

    try {
        const { machine_id, query } = DiagnosticQuerySchema.parse(data);
        const supabase = createClient();

        // 1. Machine Context
        const { data: machine } = await supabase
            .from('machines')
            .select('*')
            .eq('id', machine_id)
            .single();

        // 2. Vector Search for RAG
        if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY missing');
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const embeddingModel = genAI.getGenerativeModel({ model: "text-embedding-004" });
        const embedResult = await embeddingModel.embedContent(query);
        const queryVector = `[${embedResult.embedding.values.join(",")}]`;

        // a) Match Manuals (Documents)
        const { data: manualChunks } = await supabase.rpc('match_documents', {
            query_embedding: queryVector,
            match_threshold: 0.5,
            match_count: 5,
            p_machine_id: machine_id
        });

        // b) Match Past Repairs
        const { data: repairIntel } = await supabase.rpc('match_repairs', {
            query_embedding: queryVector,
            match_threshold: 0.6,
            match_count: 3,
            p_organization_id: machine?.owner_org_id || machine?.organization_id
        });

        // 3. Synthesis with Gemini
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro", generationConfig: { responseMimeType: "application/json" } });
        
        const prompt = `
            Tu es l'Expert Diagnostic EnviroJim. Analyse le problème suivant : "${query}"
            Machine: ${machine?.make} ${machine?.model} (${machine?.current_hours} heures)
            
            CONTEXTE TECHNIQUE (RAG) :
            - Documentation : ${JSON.stringify(manualChunks || [])}
            - Historique Réparations : ${JSON.stringify(repairIntel || [])}
            
            TACHE :
            1. Fournis une "assessment" détaillée de la situation (technique, factuelle).
            2. Propose des "potential_causes" avec "cause", "confidence" (0-1) et "evidence" (citation courte).
            3. Liste les "next_steps" (actions immédiates).
            4. Identifie les "linked_procedures" et "linked_parts" par leur nom/titre si possible.
            5. Rédige un "client_facing_message" ultra-positif et orienté action (ex: "Votre machine sera bientôt opérationnelle, voici le plan d'intervention préconisé").
            
            JSON STRICT :
            {
              "assessment": "...",
              "potential_causes": [{"cause": "...", "confidence": 0.9, "evidence": "..."}],
              "next_steps": ["...", "..."],
              "linked_procedures": ["..."],
              "linked_parts": ["..."],
               "client_facing_message": "..."
            }
        `;

        const responseResult = await model.generateContent(prompt);
        const parsed = JSON.parse(responseResult.response.text()) as DiagnosticResult;
        
        return { success: true, result: parsed };

    } catch (e: any) {
        console.error('[getDiagnosticAnalysis Error]', e);
        return { success: false, error: e.message };
    }
}
