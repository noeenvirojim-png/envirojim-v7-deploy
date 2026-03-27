require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

const connectionString = process.env.POSTGRES_URL.replace('?sslmode=require', '');

const client = new Client({
    connectionString,
    ssl: {
        rejectUnauthorized: false
    }
});

async function applyHotfix() {
    try {
        console.log('🔌 Connecting to database...');
        await client.connect();
        console.log('✅ Connected.');

        const sql = `
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_record RECORD;
    claims jsonb;
BEGIN
    -- Fetch user data
    SELECT
        id, organization_id, role, email, full_name, deleted_at
    INTO user_record
    FROM public.users
    WHERE id = (event->>'user_id')::uuid;

    -- Handle user not found or deleted
    IF NOT FOUND OR user_record.deleted_at IS NOT NULL THEN
        RETURN jsonb_build_object('claims', event->'claims');
    END IF;

    -- Initialize claims from existing event data to preserve 'aud', 'exp', etc.
    claims := event->'claims';

    -- Merge custom claims
    claims := jsonb_set(claims, '{org_id}', to_jsonb(user_record.organization_id));
    claims := jsonb_set(claims, '{role}', to_jsonb(user_record.role));
    
    -- Ensure user_metadata is synced if needed, but safe to omit if handled by Auth
    -- We specifically avoid overwriting user_metadata with a full object to allow Auth to manage it
    -- or we carefuly merge it if required. For now, skipping to avoid schema issues.

    RETURN jsonb_build_object('claims', claims);
END;
$$;
    `;

        console.log('🛠️ Applying Hook Hotfix...');
        await client.query(sql);
        console.log('✅ Hotfix applied successfully!');

    } catch (err) {
        console.error('❌ Error executing hotfix:', err);
    } finally {
        await client.end();
    }
}

applyHotfix();
