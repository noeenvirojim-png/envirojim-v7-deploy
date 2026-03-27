const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function testAdmin() {
    console.log('Testing Admin Access...');
    const email = `admin-test-${Date.now()}@test.com`;
    const password = 'password123';

    try {
        console.log('Creating user...');
        const { data, error } = await supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true
        });

        if (error) throw error;
        console.log('✅ User created:', data.user.id);

        console.log('Attempting Login...');
        const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (loginError) {
            console.error('❌ Login Failed:', loginError.message);
        } else {
            console.log('✅ Login Successful. Session:', loginData.session ? 'Created' : 'Missing');
        }

        console.log('Deleting user...');
        const { error: delError } = await supabase.auth.admin.deleteUser(data.user.id);
        if (delError) throw delError;
        console.log('✅ User deleted.');

    } catch (err) {
        console.error('❌ Admin Access Failed:', err);
    }
}

testAdmin();
