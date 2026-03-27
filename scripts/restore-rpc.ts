import { Client } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

async function restoreRpc() {
    console.log('🔌 Connecting to DB...');
    if (!process.env.DATABASE_URL) {
        throw new Error('DATABASE_URL is not defined');
    }

    const client = new Client({
        connectionString: process.env.DATABASE_URL,
    });

    try {
        await client.connect();
        console.log('✅ Connected.');

        const sql = `
-- Function: create_machine_with_document
CREATE OR REPLACE FUNCTION create_machine_with_document(
    p_machine_data JSONB,
    p_document_data JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_org_id UUID;
    v_machine_id UUID;
    v_document_id UUID;
    v_result JSONB;
BEGIN
    -- 0. SECURITY CHECK
    v_org_id := (p_machine_data->>'organization_id')::UUID;
    -- Bypass is_admin check for now if function missing, relying on RLS?
    -- No, use original logic but ensure helper functions exist.
    -- Assuming is_admin and get_auth_org_hierarchy exist as they are core.
    
    IF NOT is_admin(auth.uid()) AND NOT EXISTS (
        SELECT 1 FROM get_auth_org_hierarchy() WHERE org_id = v_org_id
    ) THEN
        RAISE EXCEPTION 'Access Denied: You do not have permission to create machines for this organization.';
    END IF;

    -- 1. Insert machine
    INSERT INTO public.machines (
        organization_id,
        site_id,
        serial_number,
        make,
        model,
        year,
        current_hours,
        engine_make,
        engine_serial,
        assigned_partner_id
    )
    VALUES (
        v_org_id,
        (p_machine_data->>'site_id')::UUID,
        p_machine_data->>'serial_number',
        p_machine_data->>'make',
        p_machine_data->>'model',
        (p_machine_data->>'year')::INTEGER,
        COALESCE((p_machine_data->>'current_hours')::INTEGER, 0),
        p_machine_data->>'engine_make',
        p_machine_data->>'engine_serial',
        (p_machine_data->>'assigned_partner_id')::UUID
    )
    RETURNING id INTO v_machine_id;

    -- 2. Insert document if provided
    IF p_document_data IS NOT NULL THEN
        INSERT INTO public.documents (
            machine_id,
            organization_id,
            title,
            file_url
        )
        VALUES (
            v_machine_id,
            v_org_id,
            p_document_data->>'title',
            p_document_data->>'file_url'
        )
        RETURNING id INTO v_document_id;
    END IF;

    v_result := jsonb_build_object(
        'machine_id', v_machine_id,
        'document_id', v_document_id
    );

    RETURN v_result;
END;
$$;
        `;

        console.log('🛠️ Restoring create_machine_with_document...');
        await client.query(sql);
        console.log('✅ Function restored successfully.');

    } catch (err) {
        console.error('❌ Error restoring RPC:', err);
        process.exit(1);
    } finally {
        await client.end();
    }
}

restoreRpc();
