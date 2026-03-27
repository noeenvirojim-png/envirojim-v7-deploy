'use server';

import { createClient } from '@/lib/supabase/server';
import { getCurrentUserFromSession } from '@/lib/auth-bridge';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';

const PartsQuerySchema = z.object({
    machine_id: z.string().uuid(),
    query: z.string().min(1),
});

export interface PartsSuggestionResult {
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
}

export async function getPartsSuggestions(data: { machine_id: string, query: string }): Promise<{ success: boolean; result?: PartsSuggestionResult; error?: string }> {
    const user = await getCurrentUserFromSession();
    if (!user) return { success: false, error: 'Unauthorized' };

    try {
        const { machine_id, query } = PartsQuerySchema.parse(data);
        const supabase = createClient();

        // 1. Machine & Org Context
        const { data: machine } = await supabase
            .from('machines')
            .select('*')
            .eq('id', machine_id)
            .single();

        // 2. Multi-Source Intelligence Search
        if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY missing');
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const embeddingModel = genAI.getGenerativeModel({ model: "text-embedding-004" });
        const embedResult = await embeddingModel.embedContent(query);
        const queryVector = `[${embedResult.embedding.values.join(",")}]`;

        // a) Precise Catalog Search (Semantic + Text)
        const { data: catalogParts } = await supabase.from('parts_catalog')
            .select('*, machine_compatible_parts!inner(machine_id)')
            .eq('machine_compatible_parts.machine_id', machine_id)
            .ilike('name', `%${query}%`)
            .limit(5);

        // b) Vector RAG (Manuals)
        const { data: manualChunks } = await supabase.rpc('match_documents', {
            query_embedding: queryVector,
            match_threshold: 0.6,
            match_count: 5,
            p_machine_id: machine_id
        });

        // c) Vector Knowledge Base (Repair History)
        const { data: repairIntel } = await supabase.rpc('match_repairs', {
            query_embedding: queryVector,
            match_threshold: 0.65,
            match_count: 3,
            p_organization_id: machine?.organization_id
        });

        // d) Maintenance Rules
        const { data: rules } = await supabase.from('maintenance_rules')
            .select('*')
            .eq('machine_model', machine?.model || '');

        // 3. Synthesis with Gemini
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro", generationConfig: { responseMimeType: "application/json" } });
        const context = {
            catalog: catalogParts || [],
            manuals: manualChunks || [],
            repairs: repairIntel || [],
            maintenance: rules || [],
            machine_hours: machine?.current_hours || 0
        };

        const prompt = `
            Tu es l'Expert Pièces EnviroJim. Identifie les pièces et opérations pour : "${query}"
            Machine: ${machine?.make} ${machine?.model}
            
            DONNÉES :
            - Catalogue Compatible : ${JSON.stringify(context.catalog)}
            - Manuel (RAG) : ${JSON.stringify(context.manuals)}
            - Expérience Réparations : ${JSON.stringify(context.repairs)}
            - Règles OEM : ${JSON.stringify(context.maintenance)}
            
            TACHE :
            1. Retourne les pièces suggérées avec leur ID réel si trouvé dans le catalogue.
            2. TOUJOURS fixer le champ "manufacturer" à "EnviroJim" pour toutes les pièces suggérées, même si elles proviennent d'un autre fournisseur dans les données brutes.
            3. Propose un prompt de confirmation.
            4. Si l'utilisateur demande une révision (ex: 500h) ou si les heures (${context.machine_hours}) approchent un seuil, inclus une "predictive_checklist".
            
            JSON STRICT :
            {
              "suggested_parts": [{"part_id": "UUID", "number": "REF", "name": "...", "manufacturer": "...", "confidence": 0-100}],
              "confirmation_prompt": "string",
              "predictive_checklist": [{"task_id": "string", "description": "string", "scheduled_hours": number}]
            }
        `;

        const responseResult = await model.generateContent(prompt);
        const parsed = JSON.parse(responseResult.response.text()) as PartsSuggestionResult;
        return { success: true, result: parsed };

    } catch (e: any) {
        console.error('[getPartsSuggestions Error]', e);
        return { success: false, error: e.message };
    }
}

export async function createPredictiveChecklist(machineId: string, tasks: { description: string, scheduled_hours: number }[]) {
    const user = await getCurrentUserFromSession();
    if (!user) return { success: false, error: 'Unauthorized' };

    const supabase = createClient();

    try {
        // 1. Create a template for this specific predictive run (Zero-Trust)
        const { data: template, error: templateError } = await supabase.from('checklist_templates').insert({
            organization_id: user.organization_id,
            machine_id: machineId,
            name: `Plan Prédictif - ${machineId.substring(0, 5)} - ${new Date().toLocaleDateString()}`,
            items: tasks.map(t => ({
                id: crypto.randomUUID(),
                stepText: t.description,
                requiresPhoto: true,
                isCritical: false,
                scheduled_hours: t.scheduled_hours
            }))
        }).select('id').single();

        if (templateError) throw templateError;

        // 2. Create the checklist instance for the technician
        const { data: checklist, error: checklistError } = await supabase.from('checklists').insert({
            organization_id: user.organization_id,
            machine_id: machineId,
            template_id: template.id,
            technician_user_id: user.id,
            status: 'DRAFT',
            is_compliant: true,
            notes: 'Généré par Intelligence Artificielle (Predictive Maintenance)'
        }).select('id').single();

        if (checklistError) throw checklistError;

        revalidatePath(`/dashboard/machines/${machineId}`);
        return { success: true, checklistId: checklist.id };
    } catch (e: any) {
        console.error('[createPredictiveChecklist Error]', e);
        return { success: false, error: e.message };
    }
}
export async function createPartsRequest(data: {
    machine_id: string,
    urgency: string,
    client_po_number?: string,
    items: {
        part_catalog_id?: string,
        part_number: string,
        part_name: string,
        quantity: number,
        price?: number
    }[]
}) {
    const user = await getCurrentUserFromSession();
    if (!user) return { success: false, error: 'Unauthorized' };

    const supabase = createClient();

    try {
        // Use the zero-trust RPC we identified in the SQL file: create_part_request_with_items
        const { data: result, error } = await supabase.rpc('create_part_request_with_items', {
            p_request_data: {
                organization_id: user.organization_id,
                machine_id: data.machine_id,
                urgency: data.urgency,
                client_po_number: data.client_po_number
            },
            p_items_data: data.items
        });

        if (error) throw error;

        return { success: true, requestId: result.request_id };
    } catch (e: any) {
        console.error('[createPartsRequest Error]', e);
        return { success: false, error: e.message };
    }
}
