require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const { Client } = require('pg');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const client = new Client({
    connectionString: process.env.POSTGRES_URL.replace('6543', '5432'),
    ssl: { rejectUnauthorized: false }
});

async function checkDynamic() {
    try {
        await client.connect();
        const { rows } = await client.query('SELECT * FROM public.users');
        console.log('Current Users:', rows);
    } catch (e) {
        console.error('Error:', e);
    } finally {
        await client.end();
    }
}

checkDynamic();
