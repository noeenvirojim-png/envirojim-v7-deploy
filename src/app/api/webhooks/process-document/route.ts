import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
const pdfParse = require('pdf-parse');
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
// Embedding model is text-embedding-004 (768 dimensions)
const embeddingModel = genAI.getGenerativeModel({ model: "text-embedding-004" });
// Extraction model
const extractionModel = genAI.getGenerativeModel({
    model: 'gemini-1.5-pro',
    generationConfig: { responseMimeType: "application/json" }
});

const CHUNK_SIZE = 4000; 
const CHUNK_OVERLAP = 500;

export async function POST(req: Request) {
    try {
        const { document_id, machine_id, organization_id, file_url } = await req.json();

        if (!document_id || !machine_id || !file_url) {
            return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
        }

        const supabase = createAdminClient();

        // 1. Update status to PROCESSING
        await supabase
            .from('documents')
            .update({ processing_status: 'PROCESSING' })
            .eq('id', document_id);

        // 2. Download PDF
        const parts = file_url.split('/documents/');
        if (parts.length < 2) throw new Error('Invalid file URL');
        const filePath = parts[1];

        const { data: fileData, error: downloadError } = await supabase.storage
            .from('documents')
            .download(filePath);

        if (downloadError || !fileData) {
            throw new Error(`Download failed: ${downloadError?.message}`);
        }

        // 3. Extract Raw Text
        const arrayBuffer = await fileData.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const pdfResult = await pdfParse(buffer);
        const rawText = pdfResult.text;

        if (!rawText || rawText.trim().length === 0) {
            throw new Error('PDF extraction returned empty text');
        }

        // 4. Semantic Chunking & Vector Storage
        const chunks: string[] = [];
        let startIndex = 0;
        while (startIndex < rawText.length) {
            const end = Math.min(startIndex + CHUNK_SIZE, rawText.length);
            chunks.push(rawText.substring(startIndex, end));
            startIndex += (CHUNK_SIZE - CHUNK_OVERLAP);
        }

        console.log(`[AI] Generating ${chunks.length} embeddings for doc ${document_id}`);
        for (let i = 0; i < chunks.length; i++) {
            const chunkText = chunks[i].trim();
            if (chunkText.length < 50) continue;

            try {
                const result = await embeddingModel.embedContent(chunkText);
                const vectorString = `[${result.embedding.values.join(',')}]`;

                await supabase.from('document_embeddings').insert({
                    organization_id,
                    machine_id,
                    document_id,
                    content_chunk: chunkText,
                    embedding: vectorString,
                    page_number: Math.floor(i / 2) + 1
                });
            } catch (err) {
                console.error(`Failed embedding chunk ${i}:`, err);
            }
        }

        // 5. Granular OEM Extraction (Diagnostic, Training, Procedures V8)
        console.log(`[AI] Extracting Structured Guidance Systems for doc ${document_id}`);
        const extractionPrompt = `
        Tu es l'Architecte IA Industriel EnviroJim. Analyse ce manuel technique pour la machine ${machine_id}.
        Extrais les systèmes de guidage structurés suivants au format JSON strict.
        
        {
          "diagnostic_trees": [
            {
              "symptom": "string",
              "tree_structure_json": {
                "root": {
                  "step_id": "S1",
                  "instruction": "string",
                  "inspection_points": ["point A", "point B"],
                  "question": "string (Yes/No)",
                  "expected_values": "string",
                  "next_step_yes": "step_id or RESULT_SUCCESS",
                  "next_step_no": "step_id or RESULT_FAILURE",
                  "probable_cause": "string (only for leaf nodes)",
                  "suggested_parts": ["part numbers"]
                },
                "S2": { ... }
              },
              "confidence_score": 0.0-1.0
            }
          ],
          "training_modules": [
            {
              "module_title": "string",
              "difficulty_level": "BEGINNER | INTERMEDIATE | ADVANCED",
              "module_json": {
                "overview": "string",
                "components": [{"id": "C1", "name": "string", "description": "string"}],
                "steps": [{"title": "string", "instruction": "string", "safety_notes": "string"}],
                "verification_questions": [{"question": "string", "answer": "string"}]
              }
            }
          ],
          "maintenance_procedures": [
            {
              "procedure_title": "string",
              "procedure_json": {
                "required_tools": ["tool A"],
                "required_parts": ["part_number"],
                "safety_warnings": ["warning 1"],
                "preparation_steps": ["step 1"],
                "repair_steps": [{"step": "string", "confirmation_required": true}],
                "verification_steps": ["check 1"]
              }
            }
          ],
          "parts_catalog_updates": [
            {
              "part_number": "string",
              "name": "string",
              "description": "string"
            }
          ]
        }
        
        REGLES CRITIQUES :
        1. Les Diagnostic Trees doivent être logiques : Question -> Yes/No -> Next Step.
        2. Chaque étape doit être vérifiable industriellement.
        3. Score de confiance : <0.75 déclenchera une escalade concessionnaire.
        4. ISOLATION : Ce contenu appartient uniquement à la machine ${machine_id}.
        
        TEXTE MANUEL :
        ---
        ${rawText.substring(0, 30000)}
        ---
        `;

        const aiResult = await extractionModel.generateContent(extractionPrompt);
        const v8Data = JSON.parse(aiResult.response.text());

        // 6. Persistence to V8 Tables
        if (v8Data.diagnostic_trees?.length) {
            for (const tree of v8Data.diagnostic_trees) {
                await supabase.from('diagnostic_trees').insert({
                    machine_id,
                    symptom: tree.symptom,
                    tree_structure_json: tree.tree_structure_json,
                    confidence_score: tree.confidence_score,
                    tree_version: 1
                });
            }
        }

        if (v8Data.training_modules?.length) {
            for (const mod of v8Data.training_modules) {
                await supabase.from('training_modules').insert({
                    machine_id,
                    module_title: mod.module_title,
                    module_json: mod.module_json,
                    difficulty_level: mod.difficulty_level
                });
            }
        }

        if (v8Data.maintenance_procedures?.length) {
            for (const proc of v8Data.maintenance_procedures) {
                await supabase.from('maintenance_procedures').insert({
                    machine_id,
                    procedure_title: proc.procedure_title,
                    procedure_json: proc.procedure_json
                });
            }
        }

        // Standard parts catalog update
        if (v8Data.parts_catalog_updates?.length) {
            for (const p of v8Data.parts_catalog_updates) {
                await supabase.from('parts_catalog').upsert({
                    organization_id,
                    part_number: p.part_number,
                    name: p.name,
                    description: p.description,
                    manufacturer: 'OEM'
                }, { onConflict: 'part_number, organization_id' });
            }
        }

        // 7. Update status to INDEXED
        await supabase
            .from('documents')
            .update({ processing_status: 'INDEXED' })
            .eq('id', document_id);

        return NextResponse.json({ success: true, partsExtracted: oemData.parts?.length || 0 });

    } catch (error: any) {
        console.error('[AI Pipeline Error]', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
