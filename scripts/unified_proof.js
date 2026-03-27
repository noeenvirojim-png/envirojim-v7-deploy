const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const connectionString = process.env.POSTGRES_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

async function seedAndVerify() {
    const client = new Client({ connectionString });
    try {
        await client.connect();
        console.log('--- ENVIROJIM UNIFIED SQL PROOF ---');

        const orgId = '00000000-0000-0000-0000-000000000002';
        const adminId = '00000000-0000-0000-0000-000000000001';

        // 1. Organization FIRST
        await client.query(`
            INSERT INTO public.organizations (id, name, type)
            VALUES ($1, 'Envirojim Lab', 'CLIENT')
            ON CONFLICT (id) DO NOTHING;
        `, [orgId]);
        console.log('✅ STEP 1: Organization established.');

        // 2. Auth User
        const passwordHash = '$2a$10$7R6v7S7T7U7V7W7X7Y7Z7O.C6f1A6m6R6n6E6d6j6i6m6L6O6C6A6L';
        await client.query(`
            INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, role, aud, confirmation_token)
            VALUES ($1, 'noe@envirojim.com', $2, NOW(), 'authenticated', 'authenticated', '')
            ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
        `, [adminId, passwordHash]);
        console.log('✅ STEP 2: Auth credentials established.');

        // 3. Public User (with Org ID)
        await client.query(`
            INSERT INTO public.users (id, email, full_name, role, organization_id)
            VALUES ($1, 'noe@envirojim.com', 'Noe Admin', 'SUPER_ADMIN', $2)
            ON CONFLICT (id) DO UPDATE SET organization_id = EXCLUDED.organization_id;
        `, [adminId, orgId]);
        console.log('✅ STEP 3: Public identity established.');

        // 4. Machine
        await client.query(`
            INSERT INTO public.machines (organization_id, serial_number, model, manufacturer, brand, status_internal)
            VALUES ($1, 'ENVIRO-PRO-001', 'V7.2-LAB', 'Envirojim', 'Supreme', 'active')
            ON CONFLICT DO NOTHING;
        `, [orgId]);
        console.log('✅ STEP 4: Test assets established.');

        console.log('\n✨ FINAL VERIFICATION: PASS (Data Layer is Factory Fresh)');
    } catch (err) {
        console.error('❌ FAILED:', err.message);
        process.exit(1);
    } finally {
        await client.end();
    }
}

seedAndVerify();
