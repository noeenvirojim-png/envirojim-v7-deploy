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

async function restoreAndTest() {
    try {
        // 1. Apply Restoration
        console.log('🔄 Restoring Hook...');
        await pgClient.connect();
        const sql = fs.readFileSync('db/RESTORE_HOOK_FINAL.sql', 'utf8');
        await pgClient.query(sql);
        console.log('✅ Hook Restored.');
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
            // Log full structure to debug where the claim lands
            console.log('   App Metadata:', JSON.stringify(data.session.user.app_metadata, null, 2));
            console.log('   User Metadata:', JSON.stringify(data.session.user.user_metadata, null, 2));
            // Check access token payload directly if possible (decoded) - or just trust app_metadata should have it
        }
    } catch (e) {
        console.error('🔥 EXECUTION ERROR:', e);
    }
}

restoreAndTest();
