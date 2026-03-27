
const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function checkTriggers() {
    const client = new Client({
        connectionString: process.env.POSTGRES_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();

        console.log('--- Triggers on auth.users ---');
        const authRes = await client.query(`
            SELECT tgname, tgenabled, tgtype 
            FROM pg_trigger 
            WHERE tgrelid = 'auth.users'::regclass;
        `);
        console.table(authRes.rows);

        console.log('\n--- Triggers on public.users ---');
        const pubRes = await client.query(`
            SELECT tgname, tgenabled, tgtype 
            FROM pg_trigger 
            WHERE tgrelid = 'public.users'::regclass;
        `);
        console.table(pubRes.rows);

        console.log('\n--- Checking handle_new_user function ---');
        const funcRes = await client.query(`
            SELECT prosrc 
            FROM pg_proc 
            WHERE proname = 'handle_new_user';
        `);
        if (funcRes.rows.length > 0) {
            console.log(funcRes.rows[0].prosrc);
        } else {
            console.log('Function handle_new_user not found.');
        }

    } catch (error) {
        console.error('❌ SQL Error:', error.message);
    } finally {
        await client.end();
    }
}

checkTriggers();
