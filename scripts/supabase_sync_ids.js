
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function syncIds() {
    console.log('🛑 EMERGENCY AUTH ID SYNC (Supabase Client only)');

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    try {
        // 1. Get real IDs from Auth
        const { data: { users: authUsers }, error: authError } = await supabase.auth.admin.listUsers();
        if (authError) throw authError;

        console.log(`🔍 Found ${authUsers.length} auth users.`);

        // 2. Get all public.users
        const { data: publicUsers, error: publicError } = await supabase.from('users').select('*');
        if (publicError) throw publicError;

        console.log(`🔍 Found ${publicUsers.length} public.users.`);

        for (const authUser of authUsers) {
            const matchingPublicUser = publicUsers.find(u => u.email === authUser.email);

            if (matchingPublicUser) {
                console.log(`   🔄 Syncing ${authUser.email}: ${matchingPublicUser.id} -> ${authUser.id}`);

                // IMPORTANT: Since ID is a primary key, we might need a direct SQL update if we can't change PK in Supabase.
                // However, if we just want to FIX the desync, we should update the ID.
                // Actually, if we update the ID, it might fail if there are foreign key constraints.
                // A better way is to DELETE and RE-INSERT if mapping is wrong, OR just use the AUTH ID from the start.

                // Let's try direct update first.
                const { error: updateError } = await supabase
                    .from('users')
                    .update({ id: authUser.id })
                    .eq('email', authUser.email);

                if (updateError) {
                    console.error(`   ❌ Update error for ${authUser.email}:`, updateError.message);
                } else {
                    console.log(`   ✅ Synced ${authUser.email}`);
                }
            } else {
                console.log(`   ⚠️ NOTICE: No public.user record for ${authUser.email}`);
            }
        }

    } catch (e) {
        console.error('❌ FATAL SYNC ERROR:', e.message);
    }
}

syncIds();
