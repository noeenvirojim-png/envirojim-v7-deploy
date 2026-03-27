const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '../.env.local') });

const connectionString = process.env.POSTGRES_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

async function deleteAdmin() {
    const client = new Client({ connectionString });
    try {
        await client.connect();
        console.log('--- DELETING EXISTING ADMIN ---');
        
        // cascade to identities and public profiles if set up, or do it manually
        await client.query("DELETE FROM auth.users WHERE email = 'noe@envirojim.com'");
        await client.query("DELETE FROM public.users WHERE email = 'noe@envirojim.com'");
        
        console.log('✅ EXISTING ADMIN DELETED.');

    } catch (err) {
        console.error('❌ DELETE FAILED:', err.message);
    } finally {
        await client.end();
    }
}

deleteAdmin();
