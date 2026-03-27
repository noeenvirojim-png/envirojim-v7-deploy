require('dotenv').config({ path: '.env.local' });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { Client } = require('pg');

async function cleanup() {
    console.log('🧹 Cleaning up test machines...');
    const client = new Client({
        connectionString: process.env.POSTGRES_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();

        // Delete machines with serial number starting with CONTRACT-
        const res = await client.query("DELETE FROM machines WHERE serial_number LIKE 'CONTRACT-%'");
        console.log(`✅ Deleted ${res.rowCount} machines.`);

        // Also cleanup associated documents if any
        const docRes = await client.query("DELETE FROM documents WHERE title LIKE '%CONTRACT-%'");
        console.log(`✅ Deleted ${docRes.rowCount} documents.`);

    } catch (err) {
        console.error('❌ Cleanup failed:', err.message);
    } finally {
        await client.end();
    }
}

cleanup();
