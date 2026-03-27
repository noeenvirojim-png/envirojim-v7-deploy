require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const client = new Client({
    connectionString: process.env.POSTGRES_URL,
    ssl: { rejectUnauthorized: false }
});

async function dumpHook() {
    try {
        await client.connect();
        const { rows } = await client.query("SELECT prosrc FROM pg_proc WHERE proname = 'custom_access_token_hook'");
        console.log('--- HOOK SOURCE START ---');
        console.log(rows[0]?.prosrc);
        console.log('--- HOOK SOURCE END ---');
    } catch (e) {
        console.error('ERROR:', e);
    } finally {
        await client.end();
    }
}

dumpHook();
