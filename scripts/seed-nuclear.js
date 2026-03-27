
const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function seed() {
    const client = new Client({
        connectionString: process.env.POSTGRES_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('--- STERILE SEED START ---');

        const D_ORG = '00000000-0000-0000-0000-000000000001';

        // 1. Wipe and Restore minimal set
        await client.query('TRUNCATE TABLE public.tickets, public.machines CASCADE');

        // 2. Machine
        const m1Id = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
        await client.query(`
            INSERT INTO public.machines (id, serial_number, model, make, current_hours, status, organization_id) 
            VALUES ($1, 'EJ-NUCLEAR-001', 'V6-SUPREME', 'EnviroJim', 100, 'OPERATIONAL', $2)
        `, [m1Id, D_ORG]);

        // 3. User
        const uRes = await client.query("SELECT id FROM public.users LIMIT 1");
        const uId = uRes.rows[0].id;

        // 4. Ticket
        await client.query(`
            INSERT INTO public.tickets (id, title, status, priority, machine_id, organization_id, created_by) 
            VALUES (gen_random_uuid(), 'Certification System Health', 'OPEN', 'HIGH', $1, $2, $3)
        `, [m1Id, D_ORG, uId]);

        console.log('✅ Sterile data seeded successfully');

    } catch (err) {
        console.error('❌ SEED ERROR:', err.message);
    } finally {
        await client.end();
    }
}

seed();
