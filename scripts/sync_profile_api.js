const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '../.env.local') });

const connectionString = process.env.POSTGRES_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

async function syncProfile() {
    const client = new Client({ connectionString });
    try {
        await client.connect();
        
        // 1. Get the NEW UUID from auth.users
        const userRes = await client.query("SELECT id FROM auth.users WHERE email = 'noe@envirojim.com'");
        if (userRes.rowCount === 0) {
            console.error('❌ USER NOT FOUND IN AUTH.USERS');
            return;
        }
        const userId = userRes.rows[0].id;
        console.log('User UUID:', userId);

        // 2. Create Root Organization
        await client.query(`
            INSERT INTO public.organizations (id, name, type, status, created_at, updated_at)
            VALUES ('00000000-0000-0000-0000-000000000000', 'EnviroJim Root', 'PLATFORM', 'active', now(), now())
            ON CONFLICT (id) DO NOTHING
        `);

        // 3. Create Profile
        await client.query(`
            INSERT INTO public.users (id, email, role, organization_id, full_name, status, created_at, updated_at)
            VALUES ($1, 'noe@envirojim.com', 'ENVIROJIM_ADMIN', '00000000-0000-0000-0000-000000000000', 'Noé Admin', 'ACTIVE', now(), now())
            ON CONFLICT (id) DO UPDATE SET 
                role = EXCLUDED.role,
                organization_id = EXCLUDED.organization_id,
                updated_at = now()
        `, [userId]);

        console.log('✅ ORGANIZATION AND PROFILE SYNCED.');

    } catch (err) {
        console.error('❌ SYNC FAILED:', err.message);
    } finally {
        await client.end();
    }
}

syncProfile();
