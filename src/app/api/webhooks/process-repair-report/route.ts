import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const embeddingModel = genAI.getGenerativeModel({ model: "text-embedding-004" });
const extractionModel = genAI.getGenerativeModel({
    model: 'gemini-1.5-pro',
    generationConfig: { responseMimeType: "application/json" }
});

export async function POST(req: Request) {
    try {
        const { ticket_id, machine_id, organization_id, report_text } = await req.json();

        if (!report_text || !organization_id) {
            return NextResponse.json({ error: 'Missing report data' }, { status: 400 });
        }

        const supabase = createAdminClient();

        // 1. Extract Intelligence from Repair Report
        const prompt = `
        Tu es un analyste technique senior. Analyse ce rapport de réparation (BT) d'un technicien et extrais les informations structurées suivantes au format JSON.
        Identifie si le problème est spécifique à ce modèle de machine ou s'il s'agit d'un pattern générique.
        
        {
          "symptoms": {
            "description": "string (ex: Bruit métallique au niveau du convoyeur)",
            "context": "string (ex: Lors de la charge à 80%)"
          },
          "failure_mode": {
            "component": "string (ex: Roulement de palier)",
            "failure_type": "string (ex: Usure prématurée/Casse)",
            "root_cause": "string (ex: Défaut de lubrification)"
          },
          "repair_action": {
            "solution": "string (ex: Remplacement du roulement et graissage)",
            "parts_used": [{"part_number": "string", "name": "string", "qty": number}],
            "repair_time_minutes": number
          },
          "is_generic": boolean
        }
        
        REPORT:
        ---
        ${report_text}
        ---
        `;

        const aiResult = await extractionModel.generateContent(prompt);
        const intel = JSON.parse(aiResult.response.text());

        // 2. Store in Repair Knowledge Base
        const { data: kbEntry, error: kbError } = await supabase.from('repair_knowledge_base').insert({
            organization_id,
            machine_id: intel.is_generic ? null : machine_id,
            component: intel.failure_mode.component,
            symptom_pattern: intel.symptoms.description,
            failure_mode: `${intel.failure_mode.failure_type} | ${intel.failure_mode.root_cause}`,
            solution: intel.repair_action.solution,
            parts_used: intel.repair_action.parts_used,
            confidence_score: 0.9,
            occurrence_count: 1
        }).select().single();

        if (kbError || !kbEntry) throw new Error(`KB storage failed: ${kbError?.message}`);

        // 3. Generate Semantic Embeddings for Diagnostic Search
        // We embed the symptom + solution + component to allow semantic matching in Copilot
        const searchText = `Symptom: ${intel.symptoms.description}. Component: ${intel.failure_mode.component}. Solution: ${intel.repair_action.solution}`;
        const embedResult = await embeddingModel.embedContent(searchText);
        const vectorString = `[${embedResult.embedding.values.join(',')}]`;

        await supabase.from('repair_embeddings').insert({
            knowledge_id: kbEntry.id,
            embedding: vectorString
        });

        // 4. Update Fleet Intelligence (Incremental)
        // Check if pattern exists to increment risk scores
        const { data: pattern } = await supabase.from('fleet_failure_patterns')
            .select('*')
            .eq('component', intel.failure_mode.component)
            .eq('failure_mode', intel.failure_mode.failure_type)
            .single();

        if (pattern) {
            await supabase.from('fleet_failure_patterns')
                .update({ 
                    occurrence_count: pattern.occurrence_count + 1,
                    risk_score: Math.min(pattern.risk_score + 0.1, 1.0)
                })
                .eq('id', pattern.id);
        } else {
            await supabase.from('fleet_failure_patterns').insert({
                component: intel.failure_mode.component,
                failure_mode: intel.failure_mode.failure_type,
                occurrence_count: 1,
                risk_score: 0.1
            });
        }

        return NextResponse.json({ success: true, kb_id: kbEntry.id });

    } catch (error: any) {
        console.error('[Repair Pipeline Error]', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
