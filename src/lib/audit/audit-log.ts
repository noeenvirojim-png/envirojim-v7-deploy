import { createClient } from '@/lib/supabase/server';
import { getCurrentUserFromSession } from '@/lib/auth-bridge';

/**
 * Transactional Audit Logger
 * 
 * Manually logs logical application events into the public.audit_logs table.
 * Complementary to the database-level triggers.
 */

export interface AuditMetadata {
  organization_id?: string;
  source?: string;
  ip_address?: string;
  userAgent?: string;
  [key: string]: any;
}

export async function logAuditEvent(action: string, metadata: AuditMetadata = {}) {
  try {
    const supabase = createClient();
    const user = await getCurrentUserFromSession();

    // In a logical event, record_id can be the user_id or a related entity ID
    const { error } = await supabase
      .from('audit_logs')
      .insert({
        table_name: 'APP_ORCHESTRATOR',
        record_id: user?.id || '00000000-0000-0000-0000-000000000000',
        action_type: action,
        changed_by: user?.id || null,
        new_data: {
          ...metadata,
          organization_id: user?.organization_id || metadata.organization_id,
          timestamp: new Date().toISOString()
        }
      });

    if (error) {
      console.error(`[AUDIT] Insertion failed: ${error.message}`);
    }

  } catch (err: any) {
    console.error(`[AUDIT] Fatal log error: ${err.message}`);
  }
}
