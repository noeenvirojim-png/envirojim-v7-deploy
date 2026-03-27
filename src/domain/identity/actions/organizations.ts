'use server'

import { OrganizationsService } from '@/domain/identity/data/organizations';
import { getCurrentUserId } from '@/lib/auth-bridge';
import { revalidatePath } from 'next/cache';

/**
 * Server Action: Create Organization
 */
export async function createOrganizationAction(data: any) {
    try {
        const userId = await getCurrentUserId();
        if (!userId) return { success: false, error: 'Non authentifié' };

        const result = await OrganizationsService.createOrganization(data);

        revalidatePath('/dashboard/clients');
        revalidatePath('/dashboard/dealers');
        return { success: true, data: result };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

/**
 * Server Action: Update Organization
 */
export async function updateOrganizationAction(id: string, data: any) {
    try {
        const userId = await getCurrentUserId();
        if (!userId) return { success: false, error: 'Non authentifié' };

        const result = await OrganizationsService.updateOrganization(id, data);

        revalidatePath('/dashboard/clients');
        revalidatePath('/dashboard/dealers');
        return { success: true, data: result };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

/**
 * Server Action: Delete Organization
 */
export async function deleteOrganizationAction(id: string) {
    try {
        const userId = await getCurrentUserId();
        if (!userId) return { success: false, error: 'Non authentifié' };

        await OrganizationsService.deleteOrganization(id);

        revalidatePath('/dashboard/clients');
        revalidatePath('/dashboard/dealers');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
