const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') });

const connectionString = process.env.POSTGRES_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

async function checkUserRoleEnum() {
    const client = new Client({ connectionString });
    try {
        await client.connect();
        const res = await client.query(`
            SELECT e.enumlabel as label
            FROM pg_type t 
            JOIN pg_enum e ON t.oid = e.enumtypid
            WHERE t.typname = 'user_role'
            ORDER BY e.enumsortorder;
        `);
        console.log(JSON.stringify(res.rows, null, 2));

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await client.end();
    }
}

checkUserRoleEnum();
