'use server';

import { createClient } from '@/lib/supabase/server';
import { getCurrentUserFromSession } from '@/lib/auth-bridge';

export type AuditAction = 'CREATE_MACHINE' | 'UPDATE_MACHINE' | 'DELETE_MACHINE' | 'UPLOAD_DOC' | 'DELETE_DOC' | 'AI_INGESTION_START' | 'AI_INGESTION_COMPLETE';

export async function logAuditAction(data: {
    action_type: AuditAction;
    table_name: string;
    record_id: string;
    organization_id: string;
    old_data?: any;
    new_data?: any;
    metadata?: any;
}) {
    const user = await getCurrentUserFromSession();
    if (!user) return;

    const supabase = createClient();

    try {
        await supabase.from('audit_logs').insert({
            table_name: data.table_name,
            record_id: data.record_id,
            action_type: data.action_type,
            changed_by: user.id,
            organization_id: data.organization_id,
            old_data: data.old_data,
            new_data: data.new_data,
            metadata: {
                ...data.metadata,
                timestamp: new Date().toISOString(),
                user_email: user.email
            }
        });
    } catch (error) {
        console.error('[logAuditAction Error]', error);
    }
}
