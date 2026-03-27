require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const pgClient = new Client({
    connectionString: process.env.POSTGRES_URL,
    ssl: { rejectUnauthorized: false }
});

const sbClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function run() {
    try {
        // 1. Apply Reset
        console.log('🔄 Applying Hook Reset...');
        await pgClient.connect();
        const sql = fs.readFileSync('db/RESET_HOOK_CLEAN.sql', 'utf8');
        await pgClient.query(sql);
        console.log('✅ Hook Reset Applied.');
        await pgClient.end();

        // 2. Test Login
        console.log('🔑 Testing Login...');
        const { data, error } = await sbClient.auth.signInWithPassword({
            email: 'noe@envirojim.com',
            password: '@Enviro2018!'
        });

        if (error) {
            console.error('❌ LOGIN FAILED:', error.message);
        } else {
            console.log('✅ LOGIN SUCCESS!');
            console.log('   User ID:', data.user.id);
            console.log('   Role Claim:', data.session.user.app_metadata.role);
        }

    } catch (e) {
        console.error('🔥 EXECUTION ERROR:', e);
    }
}

run();
