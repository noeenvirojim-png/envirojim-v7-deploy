
import { Client } from 'pg';
require('dotenv').config({ path: '.env.local' });

async function test() {
    console.log('Testing connection to:', process.env.POSTGRES_URL ? 'URL exists' : 'URL MISSING');
    const client = new Client({
        connectionString: process.env.POSTGRES_URL,
        ssl: { rejectUnauthorized: false }
    });
    try {
        await client.connect();
        console.log('Connection SUCCESS');
        const res = await client.query('SELECT NOW()');
        console.log('Query RESULT:', res.rows[0]);
    } catch (e: any) {
        console.error('Connection FAILED:', e.message);
    } finally {
        await client.end();
    }
}

test();
