'use server';

import { createClient } from '@/lib/supabase/server';
import { getCurrentUserFromSession } from '@/lib/auth-bridge';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { logAuditAction } from './audit';
import { revalidatePath } from 'next/cache';

export interface AIInferenceResult {
    make?: string;
    model?: string;
    serial_number?: string;
    year?: number;
    engine_make?: string;
    engine_model?: string;
    engine_serial?: string;
    engine_registration_date?: string;
    shafts_config?: string;
    sale_date?: string;
    po_number?: string;
    supplier?: string;
    parts_list?: {
        part_number: string;
        name: string;
        position?: string;
        description?: string;
    }[];
}

export async function processMachineWithAI(machineId: string, documentUrls: string[]): Promise<{ success: boolean; result?: AIInferenceResult; error?: string }> {
    const user = await getCurrentUserFromSession();
    if (!user) return { success: false, error: 'Unauthorized' };

    const supabase = createClient();

    try {
        await logAuditAction({
            action_type: 'AI_INGESTION_START',
            table_name: 'machines',
            record_id: machineId,
            organization_id: user.organization_id,
            metadata: { doc_count: documentUrls.length }
        });

        // 1. Fetch existing machine data to compare
        const { data: machine } = await supabase.from('machines').select('*').eq('id', machineId).single();
        if (!machine) throw new Error('Machine not found');

        // 2. Perform RAG / Vision extraction (Simulated/Stubbed for high-volume PDFs as requested)
        // In a real scenario, we'd use Gemini 1.5 Pro's long context to read all 35 PDFs.
        const apiKey = (typeof process !== 'undefined' ? process.env.GEMINI_API_KEY : '') || '';
        if (!apiKey) throw new Error('GEMINI_API_KEY missing');
        
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ 
            model: "gemini-1.5-pro", 
            generationConfig: { responseMimeType: "application/json" } 
        });

        const prompt = `
            Tu es l'Expert Ingestion EnviroJim. Tu as accès à ${documentUrls.length} manuels techniques pour cette machine.
            Extrais toutes les métadonnées techniques possibles.
            
            STRUCTURE SOUHAITÉE :
            {
                "make": "Marque",
                "model": "Modèle précis",
                "serial_number": "S/N",
                "year": 2024,
                "engine_make": "Marque Moteur",
                "engine_model": "Modèle Moteur",
                "engine_serial": "N° Moteur",
                "engine_registration_date": "YYYY-MM-DD",
                "shafts_config": "Configuration des arbres (ex: Dual Shaft, 4-Bolt)",
                "parts_list": [
                    {"part_number": "REF123", "name": "Nom", "position": "ex: Convoyeur avant droit", "description": "..."}
                ]
            }
            
            Note: Si les informations ne sont pas trouvées, laisse vide. Priorise la précision.
        `;

        // SIMULATION: Sending the document mapping to the model
        const responseResult = await model.generateContent(prompt);
        const parsed = JSON.parse(responseResult.response.text()) as AIInferenceResult;

        // 3. Update Machine Record with extracted data
        const updateData: any = {
            make: parsed.make || machine.make,
            model: parsed.model || machine.model,
            serial_number: parsed.serial_number || machine.serial_number,
            year: parsed.year || machine.year,
            engine_make: parsed.engine_make || machine.engine_make,
            engine_model: parsed.engine_model || machine.engine_model,
            engine_serial: parsed.engine_serial || machine.engine_serial,
            engine_registration_date: parsed.engine_registration_date || machine.engine_registration_date,
            shafts_config: parsed.shafts_config || machine.shafts_config,
            updated_at: new Date().toISOString()
        };

        const { error: updateError } = await supabase.from('machines').update(updateData).eq('id', machineId);
        if (updateError) throw updateError;

        // 4. Update Audit Log
        await logAuditAction({
            action_type: 'AI_INGESTION_COMPLETE',
            table_name: 'machines',
            record_id: machineId,
            organization_id: user.organization_id,
            old_data: machine,
            new_data: updateData,
            metadata: { status: 'success' }
        });

        revalidatePath(`/dashboard/machines/${machineId}`);
        return { success: true, result: parsed };

    } catch (e: any) {
        console.error('[processMachineWithAI Error]', e);
        await logAuditAction({
            action_type: 'AI_INGESTION_COMPLETE',
            table_name: 'machines',
            record_id: machineId,
            organization_id: user.organization_id,
            metadata: { status: 'failed', error: e.message }
        });
        return { success: false, error: e.message };
    }
}

export async function getMachineProcedures(machineId: string) {
    const supabase = createClient();
    const { data, error } = await supabase.from('procedures')
        .select('*')
        .eq('machine_id', machineId)
        .order('created_at', { ascending: false });
    
    return data || [];
}

export async function getMachineTrainingModules(machineId: string) {
    const supabase = createClient();
    const { data, error } = await supabase.from('training_modules')
        .select('*')
        .eq('machine_id', machineId)
        .order('created_at', { ascending: false });
    
    return data || [];
}

export async function generateMachineKnowledge(machineId: string) {
    const user = await getCurrentUserFromSession();
    if (!user) return { success: false, error: 'Unauthorized' };

    // Trigger Fusion Service
    const result = await FusionService.consolidateMachineKnowledge(machineId);
    revalidatePath(`/dashboard/machines/${machineId}`);
    return result;
}

import { FusionService } from '@/lib/ai/pipeline/fuser';
