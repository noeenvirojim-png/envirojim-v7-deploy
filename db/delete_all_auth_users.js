require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function wipeAuth() {
    console.log('🗑️ Wiping ALL Auth Users...');
    const { data: { users }, error } = await supabase.auth.admin.listUsers();

    if (error) {
        console.error('❌ Failed to list users:', error.message);
        return;
    }

    for (const user of users) {
        const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);
        if (deleteError) {
            console.error(`   ❌ Failed to delete ${user.email}: ${deleteError.message}`);
        } else {
            console.log(`   ✅ Deleted: ${user.email} (${user.id})`);
        }
    }
    console.log('✨ Auth Wipe Complete');
}

wipeAuth();
