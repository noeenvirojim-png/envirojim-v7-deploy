'use server'

import { createClient } from '@/lib/supabase/server';
import { User, RequestStatus } from '@/types/schema';

/**
 * RBAC (Role-Based Access Control) Module
 * 
 * All functions use Supabase client to ensure RLS enforcement.
 * This replaces the direct DB query approach in lib/auth.ts.
 */

/**
 * Check if a user can access a specific machine
 * Uses RLS-enforced Supabase query
 */
export async function canAccessMachine(user: User, machineId: string): Promise<boolean> {
    // 1. Super Admin and EnviroJim Admin see all
    if (user.role === 'SUPER_ADMIN' || user.role === 'ENVIROJIM_ADMIN') return true;

    const supabase = createClient();

    // 2. Query machine with RLS enforcement
    const { data: machine, error } = await supabase
        .from('machines')
        .select('owner_org_id, assigned_partner_id')
        .eq('id', machineId)
        .single();

    if (error || !machine) return false;

    // Rule: Users can access machines their Org OWNS...
    if (machine.owner_org_id === user.organization_id) return true;

    // Rule: ...OR machines their Org was ASSIGNED TO (Service Provider case)
    if (machine.assigned_partner_id === user.organization_id && ['TECHNICIAN', 'OPERATOR'].includes(user.role)) return true;

    return false;
}

/**
 * "Green Dot" Workflow Permissions
 * Can this user click the button to move to next step?
 */
export async function canApproveWorkflow(user: User, step: RequestStatus): Promise<boolean> {
    // 1. Admins can approve anything
    if (user.role === 'SUPER_ADMIN' || user.role === 'ENVIROJIM_ADMIN') return true;

    // 2. Client Org Admin roles
    if (user.role === 'CLIENT_ADMIN') {
        // Client admins approve drafted quotes/POs or final delivery
        return step === 'draft' || step === 'delivered';
    }

    // 3. Technicians & Operators
    return false;
}

/**
 * Check if user can modify a part request
 * Uses RLS-enforced Supabase query
 */
export async function canModifyPartRequest(user: User, requestId: string): Promise<boolean> {
    // 1. Admins can modify anything
    if (user.role === 'SUPER_ADMIN' || user.role === 'ENVIROJIM_ADMIN') return true;

    const supabase = createClient();

    // 2. Query part request with machine join (RLS enforced)
    const { data: request, error } = await supabase
        .from('part_requests')
        .select(`
            id,
            requester_user_id,
            machine:machines!inner(owner_org_id, assigned_partner_id)
        `)
        .eq('id', requestId)
        .single();

    if (error || !request) return false;

    // Type assertion: machine join returns single object, not array
    const machine = request.machine as unknown as { owner_org_id: string; assigned_partner_id: string | null };

    // User created the request
    if (request.requester_user_id === user.id) return true;

    // User's org owns the machine
    if (machine.owner_org_id === user.organization_id) return true;

    // User's org is assigned partner
    if (machine.assigned_partner_id === user.organization_id) return true;

    return false;
}

/**
 * Check if user can access an organization
 * Uses RLS-enforced Supabase query
 */
export async function canAccessOrganization(user: User, orgId: string): Promise<boolean> {
    // 1. Admin sees all
    if (user.role === 'SUPER_ADMIN' || user.role === 'ENVIROJIM_ADMIN') return true;

    // 2. User can access their own org
    if (user.organization_id === orgId) return true;

    return false;
}
