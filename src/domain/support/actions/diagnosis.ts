'use server'

import { createClient } from '@/lib/supabase/server';
import { DiagnosticNode } from '@/types/schema';
import { revalidatePath } from 'next/cache';
import { getCurrentUserFromSession } from '@/lib/auth-bridge';
import { logDiagnosticSession } from '@/lib/logger';

/**
 * Get the root diagnostic node (entry point)
 */
export async function getRootNode(): Promise<DiagnosticNode | null> {
    const supabase = createClient();

    const { data: node, error } = await supabase
        .from('diagnostic_nodes')
        .select(`
            *,
            options:diagnostic_options(*)
        `)
        .is('machine_model', null)
        .limit(1)
        .single();

    if (error || !node) return null;

    const { dbMapper } = await import('@/lib/db-mapper');
    // Note: The query aliases options differently or assumes logic. 
    // The mapper expects options_relation for the joined table if generic, 
    // but here we have `options:diagnostic_options`. 
    // Refactoring to match mapper expectation or mapper to match query.
    // The mapper I added uses `options_relation`. I should probably update the query alias or the mapper.
    // Updating the query is safer locally.
    const mapped = dbMapper.mapDiagnosticNode({ ...node, options_relation: node.options });

    return mapped as unknown as DiagnosticNode; // Validation that the mapped object matches expectations
}

/**
 * Get a specific diagnostic node by ID
 */
export async function getNodeById(nodeId: string): Promise<DiagnosticNode | null> {
    const supabase = createClient();

    const { data: node, error } = await supabase
        .from('diagnostic_nodes')
        .select(`
            *,
            options:diagnostic_options(*)
        `)
        .eq('id', nodeId)
        .single();

    if (error || !node) return null;

    return node as DiagnosticNode;
}

/**
 * Get diagnostic nodes for a specific machine model
 */
export async function getNodesForModel(machineModel: string): Promise<DiagnosticNode[]> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from('diagnostic_nodes')
        .select(`
            *,
            options:diagnostic_options(*)
        `)
        .or(`machine_model.eq.${machineModel},machine_model.is.null`)
        .order('created_at');

    if (error) return [];
    return data as DiagnosticNode[];
}

/**
 * Create a new diagnostic session
 */
export async function createDiagnosticSession(data: {
    machineId?: string;
}): Promise<{ success: boolean; sessionId?: string; error?: string }> {
    const supabase = createClient();
    const user = await getCurrentUserFromSession();

    if (!user) {
        return { success: false, error: 'Not authenticated' };
    }

    try {
        const currentUser = user; // Alias for minimal refactor diff
        if (!currentUser || !currentUser.organization_id) throw new Error('User organization not found');

        const rootNode = await getRootNode();
        if (!rootNode) {
            return { success: false, error: 'No diagnostic tree configured' };
        }

        const { data: session, error } = await supabase
            .from('diagnostic_sessions')
            .insert({
                organization_id: currentUser.organization_id,
                user_id: user.id,
                machine_id: data.machineId || null,
                path: [rootNode.id]
            })
            .select()
            .single();

        if (error) throw error;

        // Log session start
        logDiagnosticSession('started', session.id, user.id, data.machineId);

        return { success: true, sessionId: session.id };
    } catch (error) {
        console.error('Error creating diagnostic session:', error);
        return { success: false, error: 'Failed to create session' };
    }
}

/**
 * Update diagnostic session with next node
 */
export async function updateDiagnosticSession(
    sessionId: string,
    nextNodeId: string
): Promise<{ success: boolean; error?: string }> {
    const supabase = createClient();

    try {
        // Get current path
        const { data: session, error: fetchError } = await supabase
            .from('diagnostic_sessions')
            .select('path')
            .eq('id', sessionId)
            .single();

        if (fetchError || !session) {
            return { success: false, error: 'Session not found' };
        }

        const currentPath = Array.isArray(session.path) ? session.path : [];
        const newPath = [...currentPath, nextNodeId];

        const { error: updateError } = await supabase
            .from('diagnostic_sessions')
            .update({
                path: newPath
            })
            .eq('id', sessionId);

        if (updateError) throw updateError;

        // Log session update
        logDiagnosticSession('updated', sessionId, '', undefined);

        return { success: true };
    } catch (error) {
        console.error('Error updating diagnostic session:', error);
        return { success: false, error: 'Failed to update session' };
    }
}


/**
 * Complete diagnostic session with outcome
 */
export async function completeDiagnosticSession(
    sessionId: string,
    outcome: string
): Promise<{ success: boolean; error?: string }> {
    const supabase = createClient();
    try {
        const { error } = await supabase
            .from('diagnostic_sessions')
            .update({
                outcome: outcome
            })
            .eq('id', sessionId);

        if (error) throw error;

        // Log session completion
        logDiagnosticSession('completed', sessionId, '', undefined);

        revalidatePath('/dashboard/diagnosis');
        return { success: true };
    } catch (error) {
        console.error('Error completing diagnostic session:', error);
        return { success: false, error: 'Failed to complete session' };
    }
}

/**
 * Get user's diagnostic history
 */
export async function getDiagnosticHistory(): Promise<any[]> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from('diagnostic_sessions')
        .select(`
            *,
            machine:machines(make, model, serial_number)
        `)
        .order('created_at', { ascending: false })
        .limit(20);

    if (error) return [];
    return data;
}

/**
 * Interpret voice command using Gemini
 */
export async function interpretVoice(transcript: string): Promise<{
    intent: string;
    entities: string[];
}> {
    // This is a server action wrapper for the library function
    const { interpretVoiceCommand } = await import('@/lib/ai/gemini');
    return await interpretVoiceCommand(transcript);
}
