process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function seedValidation() {
    const client = new Client({
        connectionString: process.env.POSTGRES_URL.replace('6543', '5432'),
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('Connected to database.');

        // Get Real User ID
        const { rows: userRows } = await client.query("SELECT id FROM public.users WHERE email = 'noe@envirojim.com'");
        if (userRows.length === 0) {
            throw new Error('User noe@envirojim.com not found in public.users');
        }
        const userId = userRows[0].id;
        console.log(`Resolved User ID: ${userId}`);

        const queries = [
            // 1. Site
            {
                text: "INSERT INTO public.sites (id, organization_id, name) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING",
                values: ['11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000001', 'HQ Warehouse']
            },
            // 2. Machine
            {
                text: "INSERT INTO public.machines (id, organization_id, site_id, serial_number, make, model, year, current_hours) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (id) DO NOTHING",
                values: ['22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'SN-VALIDATION-001', 'CAT', '320GC', 2024, 150]
            },
            // 3. Ticket
            {
                text: "INSERT INTO public.tickets (id, organization_id, machine_id, created_by, title, description, priority, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (id) DO NOTHING",
                values: ['33333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', userId, 'Validation Ticket', 'Test ticket for runtime audit', 'NORMAL', 'OPEN']
            },
            // 4. Part Request
            {
                text: "INSERT INTO public.part_requests (id, organization_id, machine_id, requester_user_id, status, urgency) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (id) DO NOTHING",
                values: ['44444444-4444-4444-4444-444444444444', '00000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', userId, 'PENDING', 'NORMAL']
            }
        ];

        for (const q of queries) {
            await client.query(q.text, q.values);
            console.log(`Executed: ${q.text.substring(0, 50)}...`);
        }

        console.log('Seed data successfully applied.');
    } catch (err) {
        console.error('Error seeding data:', err);
    } finally {
        await client.end();
    }
}

seedValidation();
