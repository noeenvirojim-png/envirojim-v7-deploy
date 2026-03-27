const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

// ENVIROJIM - DIRECT SQL SEEDING (Bypass JWT)
const connectionString = process.env.POSTGRES_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

async function seed() {
    const client = new Client({ connectionString });
    try {
        await client.connect();
        console.log('Connected to Postgres at:', connectionString);

        // 1. Create System Admin
        console.log('--- Seeding Admin User ---');
        const adminId = '00000000-0000-0000-0000-000000000001';
        // Password: 'EnviroJim2024!' hashed with bcrypt (Supabase default)
        const passwordHash = '$2a$10$7R6v7S7T7U7V7W7X7Y7Z7O.C6f1A6m6R6n6E6d6j6i6m6L6O6C6A6L'; // Placeholder hash

        await client.query(`
            INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, role, aud, confirmation_token)
            VALUES ($1, 'noe@envirojim.com', $2, NOW(), 'authenticated', 'authenticated', '')
            ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
        `, [adminId, passwordHash]);

        await client.query(`
            INSERT INTO public.users (id, email, full_name, role, organization_id)
            VALUES ($1, 'noe@envirojim.com', 'Noe Admin', 'SUPER_ADMIN', NULL)
            ON CONFLICT (id) DO NOTHING;
        `, [adminId]);

        // 2. Create Test Organization
        console.log('--- Seeding Organization ---');
        const orgId = '00000000-0000-0000-0000-000000000002';
        await client.query(`
            INSERT INTO public.organizations (id, name, type)
            VALUES ($1, 'Envirojim Lab', 'CLIENT')
            ON CONFLICT (id) DO NOTHING;
        `, [orgId]);

        // Link admin to org
        await client.query(`UPDATE public.users SET organization_id = $1 WHERE id = $2`, [orgId, adminId]);

        // 3. Create Test Machine
        console.log('--- Seeding Machine ---');
        await client.query(`
            INSERT INTO public.machines (organization_id, serial_number, model, manufacturer, brand, status)
            VALUES ($1, 'ENVIRO-PRO-001', 'V7.2-LAB', 'Envirojim', 'Supreme', 'ACTIVE')
            ON CONFLICT DO NOTHING;
        `, [orgId]);

        console.log('✅ SEEDING SUCCESSFUL (Direct SQL)');
    } catch (err) {
        console.error('❌ SEEDING FAILED:', err.message);
        process.exit(1);
    } finally {
        await client.end();
    }
}

seed();
