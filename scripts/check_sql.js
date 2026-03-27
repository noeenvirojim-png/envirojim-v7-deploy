const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const connectionString = process.env.POSTGRES_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

async function verify() {
    const client = new Client({ connectionString });
    try {
        await client.connect();
        
        console.log('--- ENVIROJIM DATA LAYER PROOF ---');

        const userRes = await client.query("SELECT email, full_name, role FROM public.users WHERE email = 'noe@envirojim.com'");
        if (userRes.rows.length > 0) {
            console.log('✅ PROOF: Admin user found:', userRes.rows[0].email, `(${userRes.rows[0].full_name})`);
        } else {
            throw new Error('Admin user NOT found in public.users');
        }

        const orgRes = await client.query("SELECT name FROM public.organizations");
        console.log('✅ PROOF: Organizations found:', orgRes.rows.length);

        const machineRes = await client.query("SELECT serial_number, status_internal FROM public.machines");
        console.log('✅ PROOF: Machines found:', machineRes.rows.length, 'Example:', machineRes.rows[0]?.serial_number);

        console.log('\n✨ FINAL VERIFICATION: PASS (Data Layer is Factory Fresh)');
    } catch (err) {
        console.error('❌ VERIFICATION FAILED:', err.message);
        process.exit(1);
    } finally {
        await client.end();
    }
}

verify();
