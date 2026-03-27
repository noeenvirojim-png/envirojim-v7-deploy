
const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function checkPublicUsersTable() {
    const client = new Client({
        connectionString: process.env.POSTGRES_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();

        console.log('--- Public Users Check ---');
        const res = await client.query('SELECT email, id, organization_id, role, full_name FROM public.users');
        res.rows.forEach(row => {
            console.log(`Email: ${row.email}`);
            console.log(`  ID: ${row.id}`);
            console.log(`  OrgID: ${row.organization_id}`);
            console.log(`  Role: ${row.role}`);
            console.log(`  Name: ${row.full_name}`);
            console.log('---');
        });

    } catch (error) {
        console.error('❌ SQL Error:', error.message);
    } finally {
        await client.end();
    }
}

checkPublicUsersTable();
