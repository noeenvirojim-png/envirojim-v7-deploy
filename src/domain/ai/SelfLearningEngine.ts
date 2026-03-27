'use server';

import { createClient } from '@/lib/supabase/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Self-Learning Engine V8
 * Analyzes machine-specific repair history to detect patterns and predict failures.
 */

export async function analyzeLocalFailurePatterns(machineId: string) {
    const supabase = createClient();

    // 1. Fetch Local Repair History
    const { data: history } = await supabase.from('repair_history')
        .select('*')
        .eq('machine_id', machineId)
        .order('created_at', { ascending: false });

    if (!history || history.length < 3) {
        return { success: false, message: 'Insufficient local history for analysis.' };
    }

    // 2. Analyze with Gemini
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    const model = genAI.getGenerativeModel({ 
        model: "gemini-1.5-flash",
        generationConfig: { responseMimeType: "application/json" }
    });

    const prompt = `
        System: EnviroJim Self-Learning Engine.
        Machine ID: ${machineId}
        Local Repair History: ${JSON.stringify(history)}
        
        Analyze this data for patterns. Identify recurring symptoms and their most common causes.
        Strict Isolation: NEVER use data from other machines.
        
        Return ONLY JSON array of patterns:
        [
          {
            "symptom": "string",
            "most_common_cause": "string",
            "recommended_parts": ["part_number"],
            "confidence_score": 0.0-1.0
          }
        ]
    `;

    try {
        const result = await model.generateContent(prompt);
        const patterns = JSON.parse(result.response.text());

        // 3. Update Failure Patterns Table
        for (const p of patterns) {
            await supabase.from('failure_patterns').upsert({
                machine_id: machineId,
                symptom: p.symptom,
                most_common_cause: p.most_common_cause,
                recommended_parts: p.recommended_parts,
                confidence_score: p.confidence_score,
                updated_at: new Date().toISOString()
            }, { onConflict: 'machine_id, symptom' });
        }

        return { success: true, count: patterns.length };
    } catch (error) {
        console.error('Self-Learning Analysis Error:', error);
        return { success: false, error: 'Analysis failed' };
    }
}

export async function getFailurePredictions(machineId: string) {
    const supabase = createClient();
    const { data: patterns } = await supabase.from('failure_patterns')
        .select('*')
        .eq('machine_id', machineId)
        .gte('confidence_score', 0.75);

    return patterns || [];
}
