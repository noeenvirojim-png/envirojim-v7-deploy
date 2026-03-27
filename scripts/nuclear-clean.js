
const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function nuclearClean() {
    const client = new Client({
        connectionString: process.env.POSTGRES_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('--- NUCLEAR CLEANUP START ---');

        // Truncate all tables in public schema except maybe some spatial/extension if any
        // CASCADE handles foreign keys
        const tablesRes = await client.query(`
            SELECT tablename 
            FROM pg_tables 
            WHERE schemaname = 'public'
        `);

        for (const row of tablesRes.rows) {
            console.log(`Truncating ${row.tablename}...`);
            await client.query(`TRUNCATE TABLE public."${row.tablename}" CASCADE`);
        }

        console.log('✅ Public schema nuclear clean complete.');

    } catch (error) {
        console.error('❌ Failed:', error.message);
    } finally {
        await client.end();
    }
}

nuclearClean();
