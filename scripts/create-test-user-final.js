const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
);

async function createTestUser() {
    console.log('🚀 Creating test user via Admin API...\n');

    // Step 1: Create in auth.users
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: 'noe@envirojim.com',
        password: 'password123',
        email_confirm: true,
        user_metadata: {
            full_name: 'Noe Admin',
            role: 'SUPER_ADMIN'
        }
    });

    if (authError) {
        console.error('❌ Auth creation failed:', authError.message);
        return;
    }

    console.log('✅ Auth user created:', authData.user.id);

    // Step 2: Sync to public.users (application layer - NO TRIGGERS)
    const { error: dbError } = await supabase
        .from('users')
        .insert({
            id: authData.user.id,
            email: authData.user.email,
            role: 'SUPER_ADMIN',
            full_name: 'Noe Admin',
            is_active: true,
            org_id: '00000000-0000-0000-0000-000000000001'
        });

    if (dbError) {
        console.error('❌ Public user sync failed:', dbError.message);
        return;
    }

    console.log('✅ User fully created and synced!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Test Credentials:');
    console.log('Email: noe@envirojim.com');
    console.log('Password: password123');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

createTestUser();
