
const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function checkAuthUsersTable() {
    const client = new Client({
        connectionString: process.env.POSTGRES_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();

        console.log('--- Auth Users Count ---');
        const countRes = await client.query('SELECT count(*) FROM auth.users');
        console.log(`Total users: ${countRes.rows[0].count}`);

        console.log('\n--- User Metadata Check ---');
        const res = await client.query('SELECT email, id, raw_app_meta_data FROM auth.users');
        res.rows.forEach(row => {
            console.log(`Email: ${row.email}`);
            console.log(`  ID: ${row.id}`);
            console.log(`  Metadata: ${JSON.stringify(row.raw_app_meta_data)}`);
            console.log('---');
        });

    } catch (error) {
        console.error('❌ SQL Error:', error.message);
    } finally {
        await client.end();
    }
}

checkAuthUsersTable();
