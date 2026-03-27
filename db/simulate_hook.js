require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const client = new Client({
    connectionString: process.env.POSTGRES_URL,
    ssl: { rejectUnauthorized: false }
});

async function simulate() {
    try {
        await client.connect();

        console.log('🔄 Switching to supabase_auth_admin...');
        await client.query("SET ROLE supabase_auth_admin");

        console.log('🔍 Attempting to read public.users...');
        const { rows } = await client.query("SELECT * FROM public.users LIMIT 1");
        console.log('✅ SUCCESS: Read public.users as supabase_auth_admin');
        console.log('   Row:', rows[0]);

        console.log('🔍 Attempting to execute hook logic...');
        // Simulate what the hook does
        const userId = rows[0]?.id;
        if (userId) {
            const hookQuery = `
                SELECT 
                    id, 
                    organization_id, 
                    role, 
                    email, 
                    full_name, 
                    deleted_at 
                FROM public.users 
                WHERE id = $1
            `;
            const { rows: hookRows } = await client.query(hookQuery, [userId]);
            console.log('✅ SUCCESS: Hook logic execution passed');
            console.log('   Result:', hookRows[0]);
        }

    } catch (e) {
        console.error('❌ FAILURE:', e.message);
        if (e.code) console.error('   Code:', e.code);
        if (e.detail) console.error('   Detail:', e.detail);
        if (e.hint) console.error('   Hint:', e.hint);
    } finally {
        await client.end();
    }
}

simulate();
