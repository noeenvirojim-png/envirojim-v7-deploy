'use server';

import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from '@/lib/supabase/server';
import { getCurrentUserFromSession } from '@/lib/auth-bridge';
import { normalizeSerialNumber } from '@/lib/normalization';

export interface DiagnosticResult {
    probableCause: string;
    suggestedRepair: string[];
    suggested_parts: {
        part_id: string;
        number: string;
        name: string;
        manufacturer: string;
        confidence: number;
    }[];
    confirmation_prompt: string;
    predictive_checklist?: {
        task_id: string;
        description: string;
        scheduled_hours: number;
    }[];
    confidence: number;
    sources: string[];
}

export async function startDiagnosticSession(transcript: string, machineId: string): Promise<{ success: boolean; result?: DiagnosticResult; error?: string }> {
    const user = await getCurrentUserFromSession();
    if (!user) return { success: false, error: 'Unauthorized' };

    const supabase = createClient();
    
    // Resolve Machine ID or SN (Dual-Resolution V7.2)
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(machineId);
    let resolvedMachineId = machineId;

    const baseQuery = supabase.from('machines').select('*');
    if (isUUID) {
        baseQuery.eq('id', machineId);
    } else {
        baseQuery.eq('serial_number', normalizeSerialNumber(machineId));
    }

    let { data: machine } = await baseQuery.single();
    
    // FAILSAFE: Try fuzzy SN match if UUID or exact SN fails
    if (!machine && !isUUID) {
        const { data: fuzzyMachine } = await supabase
            .from('machines')
            .select('*')
            .ilike('serial_number', normalizeSerialNumber(machineId))
            .single();
        machine = fuzzyMachine;
    }

    if (!machine) return { success: false, error: 'Machine not found: ' + machineId };
    resolvedMachineId = machine.id;

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    const embeddingModel = genAI.getGenerativeModel({ model: "text-embedding-004" });
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

    try {
        // 1. Generate Query Embedding (Standardized 768d)
        const embedResult = await embeddingModel.embedContent(transcript);
        const queryVector = `[${embedResult.embedding.values.join(",")}]`;

        // 2. SEARCH PRIORITY 1: Repair History & Knowledge Base
        const { data: matchedRepairs } = await supabase.rpc('match_repairs', {
            query_embedding: queryVector,
            match_threshold: 0.7,
            match_count: 5,
            p_organization_id: machine.owner_org_id
        });

        // 3. SEARCH PRIORITY 2: Manuals (Improved RAG)
        const { data: matchedManuals } = await supabase.rpc('match_documents', {
            query_embedding: queryVector,
            match_threshold: 0.5, // Lower threshold for technical details
            match_count: 5,
            p_machine_id: resolvedMachineId
        });
 
        // 4. SEARCH PRIORITY 3: Global Error Codes
        const { data: matchedErrors } = await supabase.from('error_codes')
            .select('*')
            .or(`description.ilike.%${transcript}%, code.ilike.%${transcript}%`)
            .limit(5);

        // Synthesis for Gemini
        const context = {
            repairs: matchedRepairs || [],
            manuals: matchedManuals || [],
            errors: matchedErrors || [],
        };

        const prompt = `
            Tu es l'IA EnviroJim Copilot v7.2. Analyse la panne : "${transcript}"
            Machine: ${machine.make} ${machine.model} (SN: ${machine.serial_number})
            
            DONNÉES DE RÉFÉRENCE (Strictement limitées à) :
            - Historique de maintenance : ${JSON.stringify(context.repairs)}
            - Extraits du Manuel Technique : ${JSON.stringify(context.manuals)}
            - Documentation Erreurs : ${JSON.stringify(context.errors)}
            
            CONSIGNES DE FIABILITÉ :
            1. Si tu ne trouves pas la solution dans les données, admets-le et propose une inspection générale.
            2. Pour chaque pièce suggérée, fournis le numéro de référence exact présent dans les extraits.
            3. Structure ta réponse selon le schéma JSON ci-dessous.
            
            RÉPONSES UNIQUEMENT EN JSON :
            {
                "probableCause": "Explication détaillée du problème",
                "suggestedRepair": ["Étape 1", "Étape 2"],
                "suggested_parts": [{"number": "REF_PIECE", "name": "NOM_PIECE", "confidence": 0-100}],
                "confirmation_prompt": "Question courte pour valider le diagnostic",
                "confidence": 0-100,
                "sources": ["Nom du document ou code erreur"]
            }
        `;

        const resultResponse = await model.generateContent(prompt);
        let aiJson = JSON.parse(resultResponse.response.text().match(/\{[\s\S]*\}/)?.[0] || '{}');

        // PHASE 2 RELIABILITY: Part Number Anti-Hallucination Check
        if (aiJson.suggested_parts?.length > 0) {
            const partNumbers = aiJson.suggested_parts.map((p: any) => p.number);
            const { data: validParts } = await supabase
                .from('parts_catalog')
                .select('id, part_number, name, manufacturer')
                .in('part_number', partNumbers);

            // Re-map to verified data
            aiJson.suggested_parts = aiJson.suggested_parts.map((p: any) => {
                const verified = validParts?.find(v => v.part_number === p.number);
                return {
                    part_id: verified?.id || null,
                    number: verified?.part_number || p.number,
                    name: verified?.name || p.name,
                    manufacturer: verified?.manufacturer || 'Inconnu',
                    confidence: verified ? p.confidence : Math.min(p.confidence, 40), // Penalize unverified
                    is_verified: !!verified
                };
            });
        }

        return { success: true, result: aiJson };

    } catch (e: any) {
        console.error('[Copilot AI Error]', e);
        return { success: false, error: 'AI Synthesis failed' };
    }
}
