const { Client } = require('pg');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function restoreRpc() {
    console.log('📂 CWD:', process.cwd());

    // Try loading .env.local from current directory (root)
    if (fs.existsSync('.env.local')) {
        console.log('✅ Loading .env.local');
        const content = fs.readFileSync('.env.local', 'utf8');
        console.log('Keys in .env.local:');
        content.split('\n').forEach(line => {
            const key = line.split('=')[0];
            if (key && key.trim() && !key.trim().startsWith('#')) console.log(key.trim());
        });
        dotenv.config({ path: '.env.local' });
    } else {
        console.log('⚠️ .env.local not found in CWD');
    }

    // Also try .env
    if (fs.existsSync('.env')) {
        console.log('✅ Loading .env');
        const content = fs.readFileSync('.env', 'utf8');
        console.log('Keys in .env:');
        content.split('\n').forEach(line => {
            const key = line.split('=')[0];
            if (key && key.trim() && !key.trim().startsWith('#')) console.log(key.trim());
        });
        dotenv.config({ path: '.env' });
    }

    console.log('🔌 Connecting to DB...');
    const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;

    if (!connectionString) {
        console.error('❌ POSTGRES_URL (or DATABASE_URL) is not defined');
        process.exit(1);
    } else {
        console.log('🔑 Connection string found (length: ' + connectionString.length + ')');
    }

    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('✅ Connected.');

        const sql = `
-- 1. Helper: is_admin (Overloads for compatibility)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid() AND role IN ('SUPER_ADMIN', 'ENVIROJIM_ADMIN', 'DEALER_ADMIN', 'SERVICE_PROVIDER_ADMIN', 'CLIENT_ADMIN')
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_admin(p_user_id UUID)
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.users
        WHERE id = p_user_id AND role IN ('SUPER_ADMIN', 'ENVIROJIM_ADMIN', 'DEALER_ADMIN', 'SERVICE_PROVIDER_ADMIN', 'CLIENT_ADMIN')
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 2. Helper: get_auth_org_hierarchy
CREATE OR REPLACE FUNCTION public.get_auth_org_hierarchy()
RETURNS TABLE (org_id UUID) AS $$
WITH RECURSIVE hierarchy AS (
    SELECT id FROM public.organizations 
    WHERE id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
    UNION ALL
    SELECT o.id FROM public.organizations o
    INNER JOIN hierarchy h ON o.parent_id = h.id
)
SELECT id FROM hierarchy;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 3. RLS POLICIES & GRANTS (Enforce CRUD for machines and documents)
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

ALTER TABLE public.machines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "machine_all_policy" ON public.machines;
CREATE POLICY "machine_all_policy" ON public.machines FOR ALL
TO authenticated
USING (organization_id IN (SELECT org_id FROM public.get_auth_org_hierarchy()) OR public.is_admin());

DROP POLICY IF EXISTS "document_all_policy" ON public.documents;
CREATE POLICY "document_all_policy" ON public.documents FOR ALL
TO authenticated
USING (organization_id IN (SELECT org_id FROM public.get_auth_org_hierarchy()) OR public.is_admin());

-- 4. RPC: create_machine_with_document
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
    
    -- Try both variants to be super safe
    IF NOT public.is_admin(auth.uid()) AND NOT EXISTS (
        SELECT 1 FROM public.get_auth_org_hierarchy() WHERE org_id = v_org_id
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

        console.log('🛠️ Restoring RPC functions (is_admin, hierarchy, create_machine)...');
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
