
const { createClient } = require('@supabase/supabase-js');
const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function restore() {
    console.log('🚀 SYSTEM RECOVERY: SYNCING AUTH IDs');

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const pgClient = new Client({
        connectionString: process.env.POSTGRES_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await pgClient.connect();

        // 1. Get real IDs from Supabase Auth
        const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();
        if (authError) throw authError;

        console.log(`📡 Found ${users.length} auth users.`);

        for (const u of users) {
            // 2. Update public.users IDs based on email
            const res = await pgClient.query(
                'UPDATE public.users SET id = $1 WHERE email = $2 RETURNING email',
                [u.id, u.email]
            );

            if (res.rowCount > 0) {
                console.log(`   ✅ Restored: ${u.email} -> ${u.id}`);
            } else {
                console.log(`   ⚠️ Email not in public.users: ${u.email}`);
            }
        }

        // 3. Ensure "noe@envirojim.com" exists if missing (safety check)
        const noeAuth = users.find(u => u.email === 'noe@envirojim.com');
        if (noeAuth) {
            const check = await pgClient.query('SELECT id FROM public.users WHERE email = $1', ['noe@envirojim.com']);
            if (check.rowCount === 0) {
                console.log('   🔨 Injecting missing Noe record...');
                await pgClient.query(
                    'INSERT INTO public.users (id, organization_id, role, email, full_name) VALUES ($1, $2, $3, $4, $5)',
                    [noeAuth.id, '00000000-0000-0000-0000-000000000001', 'SUPER_ADMIN', 'noe@envirojim.com', 'Noe Admin']
                );
            }
        }

        console.log('✨ RECOVERY SYNC COMPLETE');
    } catch (e) {
        console.error('❌ ERROR:', e.message);
    } finally {
        await pgClient.end();
    }
}

restore();
