const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

// Use the resolved IPv6 address
const ip = '2600:1f18:2e13:9d1d:ff04:e5ed:ba12:375e';
const password = process.env.POSTGRES_URL.split(':')[2].split('@')[0]; // Extract encoded password

const connectionString = `postgresql://postgres:${password}@[${ip}]:5432/postgres?sslmode=require`;

console.log('🔌 Connecting to:', connectionString.replace(password, '****'));

const client = new Client({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
});

async function testConnection() {
    try {
        await client.connect();
        const res = await client.query('SELECT version()');
        console.log('✅ Connection Successful!');
        console.log('Version:', res.rows[0].version);
        await client.end();
    } catch (err) {
        console.error('❌ Connection Failed:', err);
    }
}

testConnection();
