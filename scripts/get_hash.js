const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '../.env.local') });

const connectionString = process.env.POSTGRES_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

async function getHash() {
    const client = new Client({ connectionString });
    try {
        await client.connect();
        const res = await client.query("SELECT encrypted_password FROM auth.users WHERE email = 'noe@envirojim.com'");
        if (res.rowCount > 0) {
            console.log('--- HASH START ---');
            console.log(res.rows[0].encrypted_password);
            console.log('--- HASH END ---');
        } else {
            console.log('User not found.');
        }

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await client.end();
    }
}

getHash();
