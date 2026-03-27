'use server';

import { createClient } from '@/lib/supabase/server';
import { getCurrentUserFromSession } from '@/lib/auth-bridge';
import { z } from 'zod';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-pro',
    generationConfig: { responseMimeType: "application/json" }
});

const AIPlanSchema = z.object({
    workOrderSuggestion: z.object({
        title: z.string(),
        description: z.string(),
        estimatedDurationHours: z.number(),
        requiredRole: z.enum(['TECHNICIAN', 'EXTERNAL_SERVICE_PARTNER']),
        priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT'])
    }),
    checklistTemplate: z.object({
        name: z.string(),
        items: z.array(z.object({
            id: z.string(),
            stepText: z.string(),
            requiresPhoto: z.boolean(),
            isCritical: z.boolean()
        }))
    })
});

/**
 * Parses machine PDF content to automatically generate maintenance plans.
 * Context: Runs after a manual/PDF is uploaded from the Digital Twin.
 */
export async function generateMaintenancePlanFromPdfText(
    machineId: string,
    extractedPdfText: string
): Promise<{ success: boolean; data?: z.infer<typeof AIPlanSchema>; error?: string }> {

    // RBAC & Auth Check
    const user = await getCurrentUserFromSession();
    if (!user) return { success: false, error: 'Authentication required' };

    // Admins and Support can generate plans
    if (!['SUPER_ADMIN', 'SUPPORT_ADMIN', 'ORG_ADMIN'].includes(user.role)) {
        return { success: false, error: 'Permission denied to generate maintenance plans' };
    }

    try {
        const prompt = `
        Tu es un expert technique industriel de la plateforme EnviroJim V6.
        Analysez le texte extrait du document technique (Manuel ou Historique) suivant afin de générer un plan de maintenance optimal.
        
        RÈGLES DE GÉNÉRATION:
        1. Retourner UNE structure JSON strikement compatible avec le schéma demandé.
        2. Proposer un \`workOrderSuggestion\` clair et précis pour déclencher l'intervention.
        3. Créer un \`checklistTemplate\` détaillé listant étape par étape les contrôles à effectuer. Indiquez 'requiresPhoto' à true pour les vérifications visuelles critiques (fuites, usures).

        SCHEMA JSON EXACT ATTENDU:
        {
          "workOrderSuggestion": {
            "title": "string",
            "description": "string",
            "estimatedDurationHours": "number",
            "requiredRole": "TECHNICIAN" | "EXTERNAL_SERVICE_PARTNER",
            "priority": "LOW" | "NORMAL" | "HIGH" | "URGENT"
          },
          "checklistTemplate": {
            "name": "string",
            "items": [
              { "id": "uuid format", "stepText": "string", "requiresPhoto": true/false, "isCritical": true/false }
            ]
          }
        }

        TEXTE EXTRAIT DU PDF:
        ---
        ${extractedPdfText.substring(0, 15000)} /* Limité à 15k char pour la sécurité des tokens */
        ---
        `;

        const result = await model.generateContent(prompt);
        const textResponse = result.response.text();

        let jsonResponse;
        try {
            jsonResponse = JSON.parse(textResponse);
        } catch (e) {
            console.error('Failed to parse Gemini JSON output', textResponse);
            return { success: false, error: 'AI Generated invalid format' };
        }

        const parsedData = AIPlanSchema.parse(jsonResponse);

        // Optional: Instantly save the template back to the DB to enforce Zero-Trust storage logic.
        const supabase = createClient();
        await supabase.from('checklist_templates').insert({
            organization_id: user.organization_id,
            machine_id: machineId,
            name: parsedData.checklistTemplate.name,
            items: parsedData.checklistTemplate.items
        });

        return { success: true, data: parsedData };

    } catch (error: any) {
        console.error('[AI PLANNER ERROR]', error);
        return { success: false, error: error.message || 'Failed to generate plan' };
    }
}
