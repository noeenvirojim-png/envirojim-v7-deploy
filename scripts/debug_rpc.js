
const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function debug() {
    const client = new Client({
        connectionString: process.env.POSTGRES_URL,
        ssl: { rejectUnauthorized: false }
    });
    await client.connect();
    try {
        console.log('Testing RPC directly...');
        const mockMachine = {
            organization_id: "00000000-0000-0000-0000-000000000001",
            serial_number: "DEBUG-01",
            make: "Debug",
            model: "Debug",
            year: 2024,
            country: "CA",
            state_province: "QC",
            city: "Montreal"
        };
        const res = await client.query(`SELECT create_machine_with_document($1)`, [JSON.stringify(mockMachine)]);
        console.log('Success:', res.rows[0]);
    } catch (e) {
        console.error('ERROR MESSAGE:', e.message);
        console.error('ERROR DETAIL:', e.detail);
        console.error('ERROR HINT:', e.hint);
        console.error('ERROR CONTEXT:', e.context);
    } finally {
        await client.end();
    }
}

debug();
