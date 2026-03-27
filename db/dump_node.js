const { Client } = require('pg');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function dump() {
    const client = new Client({
        connectionString: process.env.POSTGRES_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();

        const userRes = await client.query("SELECT * FROM auth.users WHERE email = 'noe@envirojim.com'");
        console.log('--- USER DATA ---');
        console.log(JSON.stringify(userRes.rows[0], null, 2));

        const idenRes = await client.query("SELECT * FROM auth.identities WHERE user_id = $1", [userRes.rows[0].id]);
        console.log('\n--- IDENTITY DATA ---');
        idenRes.rows.forEach((row, i) => {
            console.log(`Identity ${i + 1}:`, JSON.stringify(row, null, 2));
        });

    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

dump();
