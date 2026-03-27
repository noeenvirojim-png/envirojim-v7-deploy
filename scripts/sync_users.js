
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function syncUsers() {
    console.log('Fetching auth.users...');
    const { data: { users: authUsers }, error: authError } = await supabase.auth.admin.listUsers();

    if (authError) {
        console.error('Error fetching auth users:', authError);
        return;
    }

    for (const authUser of authUsers) {
        console.log(`Syncing ${authUser.email}...`);

        // Check if user exists in public.users
        const { data: existingUser } = await supabase
            .from('users')
            .select('id')
            .eq('id', authUser.id)
            .single();

        if (!existingUser) {
            console.log(`   Inserting ${authUser.email} into public.users...`);
            const { error: insertError } = await supabase
                .from('users')
                .insert({
                    id: authUser.id,
                    email: authUser.email,
                    role: authUser.app_metadata?.role || 'TECHNICIAN', // Default role if missing
                    organization_id: authUser.app_metadata?.org_id || '00000000-0000-0000-0000-000000000001', // Default org
                    full_name: authUser.user_metadata?.full_name || authUser.email
                });

            if (insertError) {
                console.error(`   Error inserting ${authUser.email}:`, insertError.message);
            } else {
                console.log(`   SUCCESS: ${authUser.email} synced.`);
            }
        } else {
            console.log(`   User ${authUser.email} already exists in public.users.`);
        }
    }
}

syncUsers();
