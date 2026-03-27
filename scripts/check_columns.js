const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') });

const connectionString = process.env.POSTGRES_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

async function checkColumns() {
    const client = new Client({ connectionString });
    try {
        await client.connect();
        
        console.log('--- AUTH.IDENTITIES COLUMNS ---');
        const res = await client.query(`
            SELECT column_name, data_type, is_nullable, is_generated
            FROM information_schema.columns 
            WHERE table_schema = 'auth' AND table_name = 'identities'
            ORDER BY ordinal_position;
        `);
        console.log(JSON.stringify(res.rows, null, 2));

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await client.end();
    }
}

checkColumns();
