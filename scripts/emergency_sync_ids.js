
const { createClient } = require('@supabase/supabase-js');
const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

// Bypass SSL check for local/dev connection
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function syncIds() {
    console.log('🔄 STARTING EMERGENCY ID RESYNC...');

    // Supabase Admin Client
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Direct Postgres Client
    const pgClient = new Client({
        connectionString: process.env.POSTGRES_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await pgClient.connect();

        // 1. Get real IDs from Auth
        const { data: { users }, error } = await supabase.auth.admin.listUsers();
        if (error) throw error;

        console.log(`📡 Found ${users.length} authenticated users in Supabase Auth.`);

        for (const authUser of users) {
            console.log(`   Attempting to sync: ${authUser.email} -> ${authUser.id}`);

            // 2. Update public.users matching by email
            const res = await pgClient.query(
                'UPDATE public.users SET id = $1 WHERE email = $2 RETURNING email',
                [authUser.id, authUser.email]
            );

            if (res.rowCount > 0) {
                console.log(`   ✅ SUCCESS: Synced ${authUser.email}`);
            } else {
                console.log(`   ⚠️ WARNING: No entry found in public.users for ${authUser.email}`);
            }
        }

        console.log('🏁 SYNC COMPLETE. Auth Hook should now function correctly.');

    } catch (err) {
        console.error('❌ CRITICAL SYNC FAILURE:', err.message);
    } finally {
        await pgClient.end();
    }
}

syncIds();
