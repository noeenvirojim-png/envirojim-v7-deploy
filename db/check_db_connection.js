require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const client = new Client({
    connectionString: process.env.POSTGRES_URL.replace('6543', '5432'),
    ssl: { rejectUnauthorized: false }
});

async function checkConnection() {
    try {
        await client.connect();
        const res = await client.query('SELECT inet_server_addr(), inet_server_port(), current_database(), version();');
        console.log('CONNECTION_INFO:', res.rows[0]);
    } catch (e) {
        console.error('ERROR:', e);
    } finally {
        await client.end();
    }
}

checkConnection();
