const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') });

const connectionString = process.env.POSTGRES_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

async function checkAuthUser() {
    const client = new Client({ connectionString });
    try {
        await client.connect();
        
        console.log('--- AUTH.USERS CHECK ---');
        const authRes = await client.query("SELECT id, email, encrypted_password, email_confirmed_at FROM auth.users WHERE email = 'noe@envirojim.com'");
        console.log('Auth Records:', JSON.stringify(authRes.rows, null, 2));

        console.log('\n--- PUBLIC.USERS CHECK ---');
        const publicRes = await client.query("SELECT id, email, full_name, role FROM public.users WHERE email = 'noe@envirojim.com'");
        console.log('Public Records:', JSON.stringify(publicRes.rows, null, 2));

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await client.end();
    }
}

checkAuthUser();
