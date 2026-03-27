'use server'

import { createClient } from '@/lib/supabase/server';
import { Intervention, InterventionPart } from '@/types/schema';
import { revalidatePath } from 'next/cache';
import { getCurrentUserFromSession } from '@/lib/auth-bridge';

import { z } from 'zod';
import { Machine, User } from '@/types/schema';

export interface InterventionWithJoinedData extends Intervention {
    machine: Machine;
    technician: User;
    parts: Array<InterventionPart & { part: any }>;
}

const InterventionSchema = z.object({
    machineId: z.string().uuid(),
    workDescription: z.string().min(5, "La description doit faire au moins 5 caractères"),
    isCompleted: z.boolean(),
    partsUsed: z.array(z.object({
        partId: z.string().uuid(),
        quantity: z.number().positive()
    })),
    status: z.enum(['scheduled', 'in_progress', 'awaiting_parts', 'completed', 'validated'] as const).default('in_progress')
});

/**
 * Get all interventions for the current user's organization
 */
export async function getInterventions(): Promise<InterventionWithJoinedData[]> {
    const supabase = createClient();

    const authUser = await getCurrentUserFromSession();
    if (!authUser) return [];

    const { data, error } = await supabase
        .from('interventions')
        .select(`
            *,
            machine:machines(*),
            technician:users!technician_user_id(*),
            parts:intervention_parts(
                *,
                part:parts_catalog(*)
            )
        `)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching interventions:', error);
        return [];
    }

    const { dbMapper } = await import('@/lib/db-mapper');
    return data.map(dbMapper.mapIntervention);
}

/**
 * Create a new intervention report
 */
export async function createInterventionReport(formData: any) {
    const supabase = createClient();
    const user = await getCurrentUserFromSession();

    if (!user) {
        return { success: false, error: 'Non authentifié' };
    }

    try {
        const validated = InterventionSchema.parse(formData);
        const currentUser = await getCurrentUserFromSession();
        if (!currentUser || !currentUser.organization_id) throw new Error('User organization not found');

        // 1. Create the intervention
        const { data: intervention, error: interventionError } = await supabase
            .from('interventions')
            .insert({
                organization_id: currentUser.organization_id,
                machine_id: validated.machineId,
                technician_user_id: user.id,
                work_description: validated.workDescription,
                status: validated.status,
                is_completed: validated.status === 'completed' || validated.status === 'validated',
                completed_at: (validated.status === 'completed' || validated.status === 'validated') ? new Date().toISOString() : null
            })
            .select()
            .single();

        if (interventionError) throw interventionError;

        // 2. Add parts if any
        if (validated.partsUsed.length > 0) {
            const partsToInsert = validated.partsUsed.map(p => ({
                intervention_id: intervention.id,
                part_id: p.partId,
                quantity: p.quantity
            }));

            const { error: partsError } = await supabase
                .from('intervention_parts')
                .insert(partsToInsert);

            if (partsError) throw partsError;
        }

        revalidatePath('/dashboard/interventions');
        return { success: true, interventionId: intervention.id };
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return { success: false, error: error.errors[0].message };
        }
        console.error('Error creating intervention report:', error);
        return { success: false, error: 'Échec de la création du rapport' };
    }
}

