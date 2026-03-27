
const { createClient } = require('@supabase/supabase-js');
const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

// Global override for ALL certificate issues
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function syncIds() {
    console.log('🛑 EMERGENCY AUTH ID SYNC');

    // 1. Supabase Client
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // 2. Direct Postgres Client (Root level SSL config)
    const pgClient = new Client({
        connectionString: process.env.POSTGRES_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await pgClient.connect();

        // 3. Get real IDs from Auth
        const { data: { users }, error } = await supabase.auth.admin.listUsers();
        if (error) throw error;

        console.log(`🔍 Found ${users.length} auth users.`);

        for (const u of users) {
            // 4. Update public.users matching by email
            const res = await pgClient.query(
                `UPDATE public.users SET id = $1 WHERE email = $2 RETURNING email`,
                [u.id, u.email]
            );

            if (res.rowCount > 0) {
                console.log(`   ✅ SUCCESS: ${u.email} synced to ID ${u.id}`);
            } else {
                console.log(`   ⚠️ NOTICE: No matching email found for ${u.email} in public.users`);
            }
        }

    } catch (e) {
        console.error('❌ FATAL SYNC ERROR:', e.message);
    } finally {
        await pgClient.end();
    }
}

syncIds();
