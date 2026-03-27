require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// Use direct connection to port 5432 to avoid pooler issues
const client = new Client({
    connectionString: process.env.POSTGRES_URL.replace('6543', '5432'),
    ssl: { rejectUnauthorized: false }
});

const TARGET_USERS = [
    { email: 'noe@envirojim.com', role: 'SUPER_ADMIN', name: 'Noé EVE' },
    { email: 'parts@envirojim.com', role: 'ENVIROJIM_ADMIN', name: 'Alexandre Paré' }
];

const ORG_ID = '00000000-0000-0000-0000-000000000001';

async function setupSimple() {
    try {
        await client.connect();

        // 1. Get Auth Users
        const { rows: authUsers } = await client.query('SELECT id, email FROM auth.users');
        console.log(`Found ${authUsers.length} auth users.`);

        for (const target of TARGET_USERS) {
            const authUser = authUsers.find(u => u.email === target.email);

            if (!authUser) {
                console.error(`❌ Auth user not found for ${target.email}. Run initial setup first.`);
                continue;
            }

            console.log(`Matching ${target.email} to Auth ID: ${authUser.id}`);

            // 2. Insert/Update Public User
            // Delete existing just to be sure (since no cascade on manual delete might have left junk?)
            // actually better to upsert

            const insertQuery = `
                INSERT INTO public.users (id, organization_id, role, email, full_name)
                VALUES ($1, $2, $3, $4, $5)
                ON CONFLICT (id) DO UPDATE SET
                    role = EXCLUDED.role,
                    email = EXCLUDED.email,
                    full_name = EXCLUDED.full_name,
                    updated_at = NOW();
            `;

            await client.query(insertQuery, [
                authUser.id,
                ORG_ID,
                target.role,
                target.email,
                target.name
            ]);

            console.log(`✅ Upserted public profile for ${target.email}`);

            // 3. Hydrate Auth Metadata (Critical because Auth Hook is unreliable)
            const metadata = {
                organization_id: ORG_ID,
                org_id: ORG_ID,
                role: target.role,
                user_role: target.role
            };

            await client.query(
                `UPDATE auth.users 
                 SET raw_app_meta_data = raw_app_meta_data || $1 
                 WHERE id = $2`,
                [JSON.stringify(metadata), authUser.id]
            );
            console.log(`✅ Hydrated Auth Metadata for ${target.email}`);
        }

        await client.query('COMMIT');
        console.log('✅ COMMIT executed.');

    } catch (e) {
        console.error('🔥 FATAL:', e);
    } finally {
        await client.end();
    }
}

setupSimple();
