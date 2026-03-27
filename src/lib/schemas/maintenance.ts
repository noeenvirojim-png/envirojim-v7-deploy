import { z } from 'zod';

// Zod Schema for strict validation of AI outputs
// Prevents "hallucinated" fields or malformed data from entering the database

export const MaintenanceStepSchema = z.object({
    step: z.number().int().positive({ message: "Step number must be positive" }),
    description: z.string().min(5, { message: "Description too short" }).max(500),
    duration_min: z.number().int().nonnegative().optional().default(0),
    tools_required: z.array(z.string()).optional(),
});

export const SafetyNoteSchema = z.string().min(5).max(200);

export const ExtractedManualSchema = z.object({
    machine_id: z.string().uuid({ message: "Invalid Machine UUID" }),
    manual_title: z.string().min(1),
    maintenance_steps: z.array(MaintenanceStepSchema).min(1, { message: "At least one step required" }),
    safety_notes: z.array(SafetyNoteSchema).optional().default([]),
    confidence_score: z.number().min(0).max(1).optional(),
});

export type ExtractedManual = z.infer<typeof ExtractedManualSchema>;

/**
 * Validates raw AI output against the schema.
 * Throws detailed error if validation fails.
 */
export function validateAIOutput(rawData: unknown): ExtractedManual {
    try {
        return ExtractedManualSchema.parse(rawData);
    } catch (error) {
        if (error instanceof z.ZodError) {
            console.error("AI Output Validation Failed:", JSON.stringify(error.errors, null, 2));
            throw new Error("AI Output compromised or malformed.");
        }
        throw error;
    }
}
