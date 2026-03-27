const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function createAdmin() {
    console.log('--- CREATING ADMIN VIA API ---');
    console.log('URL:', supabaseUrl);
    
    // 1. Create User
    const { data, error } = await supabase.auth.admin.createUser({
        email: 'noe@envirojim.com',
        password: 'EnviroJim2024!',
        email_confirm: true,
        user_metadata: { full_name: 'Noé Admin' }
    });

    if (error) {
        console.error('❌ FAILED TO CREATE USER:', error.message);
        return;
    }

    console.log('✅ USER CREATED:', data.user.id);

    // 2. We don't need to manually create Identity, admin.createUser handles it.
    
    // 3. Ensuring Public Profile Linkage (if needed)
    // In our V9 schema, public.users is linked.
    const { error: profileError } = await supabase
        .from('users')
        .upsert({
            id: data.user.id,
            email: 'noe@envirojim.com',
            role: 'ENVIROJIM_ADMIN', // Uppercase enum from previous check
            full_name: 'Noé Admin',
            status: 'ACTIVE'
        });

    if (profileError) {
        console.error('⚠️ PROFILE UPSERT FAILED:', profileError.message);
    } else {
        console.log('✅ PUBLIC PROFILE SYNCED.');
    }
}

createAdmin();
