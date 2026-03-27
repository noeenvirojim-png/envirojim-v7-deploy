'use server'

import { revalidatePath } from 'next/cache';

import { createClient } from '@/lib/supabase/server';
import { User, Organization, UserRole } from '@/types/schema';

/**
 * Get all organizations of type CLIENT
 */
export async function getClients(): Promise<Organization[]> {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('type', 'CLIENT')
        .order('name');

    if (error) {
        console.error('Error fetching clients:', error);
        return [];
    }

    return data as Organization[];
}

export interface TechnicianWithOrg extends User {
    organization: Organization;
}

/**
 * Get all users with TECHNICIAN role
 */
export async function getTechnicians(): Promise<TechnicianWithOrg[]> {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('users')
        .select(`
            *,
            organization:organizations(*)
        `)
        .eq('role', 'TECHNICIAN')
        .order('full_name');

    if (error) {
        console.error('Error fetching technicians:', error);
        return [];
    }

    return data as unknown as TechnicianWithOrg[];
}

/**
 * Server Action: Update User Role
 */
export async function updateUserRoleAction(userId: string, role: UserRole) {
    try {
        const { UsersService } = await import('@/domain/identity/data/users');
        const result = await UsersService.updateUserRole(userId, role);
        revalidatePath('/dashboard/users');
        return { success: true, data: result };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

/**
 * Server Action: Update User Profile
 */
export async function updateProfileAction(data: { fullName: string }) {
    try {
        const { UsersService } = await import('@/domain/identity/data/users');
        const user = await UsersService.getCurrentProfile();
        if (!user) return { success: false, error: 'Non authentifié' };

        const result = await UsersService.updateProfile(user.id, { full_name: data.fullName } as any);
        revalidatePath('/dashboard/settings');
        return { success: true, data: result };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
