require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const client = new Client({
    connectionString: process.env.POSTGRES_URL,
    ssl: { rejectUnauthorized: false }
});

const TARGET_ID = '61ac6dfa-5673-4c8e-a123-b07c222996a6';

async function checkUser() {
    try {
        await client.connect();
        console.log(`🔍 Checking for user ID: ${TARGET_ID}`);

        const { rows } = await client.query('SELECT * FROM public.users WHERE id = $1', [TARGET_ID]);

        if (rows.length > 0) {
            console.log('✅ User FOUND in public.users:');
            console.table(rows[0]);
        } else {
            console.log('❌ User NOT FOUND in public.users');

            // Debug: List all users to see if ID mismatch
            const { rows: allUsers } = await client.query('SELECT id, email FROM public.users LIMIT 5');
            console.log('   Existing users:', allUsers);
        }
    } catch (e) {
        console.error('🔥 QUERY FAILED:', e);
    } finally {
        await client.end();
    }
}

checkUser();
