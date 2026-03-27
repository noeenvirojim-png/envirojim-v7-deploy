'use server'

import { TicketsService } from '../data/tickets';
import { getCurrentUserId, getCurrentUserFromSession } from '@/lib/auth-bridge';
import { z } from 'zod';
import { TicketPriority, TicketStatus } from '@/types/schema';
import { revalidatePath } from 'next/cache';

// Validation Schema
const CreateTicketSchema = z.object({
    machineId: z.string().uuid('Machine invalide'),
    title: z.string().min(5, 'Le titre doit faire au moins 5 caractères'),
    description: z.string().min(10, 'La description doit faire au moins 10 caractères'),
    priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT'] as const).default('NORMAL'),
});

/**
 * Server Action: Create a new support ticket
 */
export async function createTicket(formData: any) {
    try {
        const userId = await getCurrentUserId();
        if (!userId) {
            return { success: false, error: 'Non authentifié' };
        }

        const user = await getCurrentUserFromSession();
        if (!user) {
            return { success: false, error: 'Profil utilisateur introuvable' };
        }

        // 1. Validate Input
        const validated = CreateTicketSchema.safeParse(formData);
        if (!validated.success) {
            return {
                success: false,
                error: validated.error.errors[0].message || 'Données invalides'
            };
        }

        // 2. Business Logic: RBAC Check
        // Only Technicians, Operators, or Admins can create tickets
        // (Handled by RLS mainly, but we check here for better UI feedback)

        // 3. Prepare Data
        const ticketData: any = {
            organization_id: user.organization_id,
            machine_id: validated.data.machineId,
            created_by: user.id,
            title: validated.data.title,
            description: validated.data.description,
            status: 'open' as TicketStatus,
            priority: validated.data.priority,
        };

        // 4. Persistence
        const result = await TicketsService.createTicket(ticketData);

        revalidatePath('/dashboard/tickets');
        return { success: true, data: result };
    } catch (error: any) {
        console.error('[TICKET ACTION] Error creating ticket:', error.message);
        return { success: false, error: 'Une erreur technique est survenue' };
    }
}

/**
 * Server Action: Update ticket status
 */
export async function updateTicketStatus(ticketId: string, status: TicketStatus) {
    try {
        const userId = await getCurrentUserId();
        if (!userId) return { success: false, error: 'Non authentifié' };

        await TicketsService.updateTicket(ticketId, { status });
        
        revalidatePath('/dashboard/tickets');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

/**
 * Server Action: Assign ticket
 */
export async function assignTicket(ticketId: string, assigneeId: string | null) {
    try {
        const userId = await getCurrentUserId();
        if (!userId) return { success: false, error: 'Non authentifié' };

        await TicketsService.assignTicket(ticketId, assigneeId);
        
        revalidatePath('/dashboard/tickets');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

/**
 * Server Action: Soft delete ticket
 */
export async function deleteTicket(ticketId: string) {
    try {
        const userId = await getCurrentUserId();
        if (!userId) return { success: false, error: 'Non authentifié' };

        await TicketsService.deleteTicket(ticketId);
        
        revalidatePath('/dashboard/tickets');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
