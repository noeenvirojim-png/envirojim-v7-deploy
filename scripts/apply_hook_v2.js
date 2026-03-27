const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

async function applyHook() {
    const connectionString = process.env.POSTGRES_URL;
    if (!connectionString) {
        console.error('Error: POSTGRES_URL is not defined in .env.local');
        process.exit(1);
    }

    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('Connected to database.');

        const sqlPath = path.join(__dirname, '..', 'db', 'RESTORE_HOOK_FINAL.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log('Applying JWT Hook SQL...');
        await client.query(sql);
        console.log('Successfully applied JWT Hook and permissions.');

        // Verification query
        console.log('\n--- VERIFICATION ---');
        const res = await client.query(`
            SELECT proname, prosrc 
            FROM pg_proc 
            JOIN pg_namespace n ON n.oid = pg_proc.pronamespace 
            WHERE n.nspname = 'public' AND proname = 'custom_access_token_hook';
        `);

        if (res.rows.length > 0) {
            console.log('CONFIRMED: custom_access_token_hook exists in public schema.');
        } else {
            console.error('FAILED: custom_access_token_hook NOT FOUND.');
        }

    } catch (err) {
        console.error('Failed to apply hook:', err.message);
        process.exit(1);
    } finally {
        await client.end();
    }
}

applyHook();
