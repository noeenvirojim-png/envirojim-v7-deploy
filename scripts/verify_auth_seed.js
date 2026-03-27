const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') });

const connectionString = process.env.POSTGRES_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

async function verifySeed() {
    const client = new Client({ connectionString });
    try {
        await client.connect();
        
        console.log('--- VERIFYING CLEAN SEED ---');
        
        const authUser = await client.query("SELECT id, email, role FROM auth.users WHERE email = 'noe@envirojim.com'");
        const authIdentity = await client.query("SELECT id FROM auth.identities WHERE user_id = '00000000-0000-0000-0000-000000000001'");
        const publicUser = await client.query("SELECT id, role FROM public.users WHERE email = 'noe@envirojim.com'");

        console.log('Auth User:', authUser.rowCount > 0 ? 'PRESENT' : 'MISSING');
        console.log('Auth Identity:', authIdentity.rowCount > 0 ? 'PRESENT' : 'MISSING');
        console.log('Public User Profile:', publicUser.rowCount > 0 ? 'PRESENT' : 'MISSING');

        if (authUser.rowCount > 0 && authIdentity.rowCount > 0 && publicUser.rowCount > 0) {
            console.log('✅ ALL RECORDS ARE CLEAN AND CONSISTENT.');
        } else {
            console.log('❌ SEED INCONSISTENCY DETECTED.');
        }

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await client.end();
    }
}

verifySeed();
