
const { createClient } = require('@supabase/supabase-js');
const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function fixUserIds() {
    console.log('🛑 EMERGENCY AUTH ID SYNC');

    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const pgClient = new Client({ connectionString: process.env.POSTGRES_URL, ssl: { rejectUnauthorized: false } });

    try {
        await pgClient.connect();
        const { data: { users }, error } = await supabase.auth.admin.listUsers();
        
        if (error) throw error;

        console.log(`🔍 Found ${users.length} auth users. Re-syncing public.users...`);

        for (const u of users) {
            const res = await pgClient.query('UPDATE public.users SET id = $1 WHERE email = $2 RETURNING email', [u.id, u.email]);
            if (res.rowCount > 0) {
                console.log(`   ✅ Synced: ${u.email} -> ${u.id}`);
            } else {
                console.log(`   ⚠️ Email not found in public.users: ${u.email}`);
            }
        }

    } catch (e) {
        console.error('❌ SYNC ERROR:', e.message);
    } finally {
        await pgClient.end();
    }
}

fixUserIds();
