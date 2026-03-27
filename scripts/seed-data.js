
const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function seedData() {
    const client = new Client({
        connectionString: process.env.POSTGRES_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('--- SEEDING DUMMY OPERATIONAL DATA ---');

        const DEFAULT_ORG = '00000000-0000-0000-0000-000000000001';
        const ACME_ORG = 'd3819632-ce1c-4a21-a157-e345fb9e639f';

        // 1. Ensure Orgs
        await client.query(`
            INSERT INTO public.organizations (id, name, type) VALUES 
            ($1, 'EnviroJim HQ', 'ENVIROJIM'),
            ($2, 'Acme Mining Co.', 'CLIENT')
            ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
        `, [DEFAULT_ORG, ACME_ORG]);

        // 2. Add some machines
        await client.query(`
            INSERT INTO public.machines (id, serial_number, model, make, current_hours, status, organization_id) VALUES 
            (gen_random_uuid(), 'EJ-V6-TEST-001', 'V6-SUPREME', 'EnviroJim', 100, 'OPERATIONAL', $1),
            (gen_random_uuid(), 'ACME-X1', 'X1-LOADER', 'Acme', 450, 'OPERATIONAL', $2)
            ON CONFLICT (serial_number) DO UPDATE SET 
                model = EXCLUDED.model, 
                make = EXCLUDED.make, 
                current_hours = EXCLUDED.current_hours, 
                status = EXCLUDED.status, 
                organization_id = EXCLUDED.organization_id;
        `, [DEFAULT_ORG, ACME_ORG]);

        // 3. Get a user for created_by
        const userRes = await client.query("SELECT id FROM public.users WHERE email = 'noe@envirojim.com' LIMIT 1");
        if (userRes.rows.length === 0) {
            throw new Error("No master user found to assign as ticket creator.");
        }
        const creatorId = userRes.rows[0].id;

        // 4. Add a ticket
        const machineIdRes = await client.query('SELECT id FROM public.machines LIMIT 1');
        if (machineIdRes.rows.length > 0) {
            const machineId = machineIdRes.rows[0].id;
            // Use title as conflict key for dummy data? No, tickets don't have unique title usually.
            // Let's just insert.
            await client.query(`
                INSERT INTO public.tickets (id, title, description, status, priority, machine_id, organization_id, created_by) VALUES 
                (gen_random_uuid(), 'Test Ticket', 'Testing the dashboard', 'OPEN', 'HIGH', $1, $2, $3);
            `, [machineId, DEFAULT_ORG, creatorId]);
        }

        console.log('✅ Operational data seeded with UPSERT logic.');

    } catch (error) {
        console.error('❌ Failed:', error.message);
    } finally {
        await client.end();
    }
}

seedData();
