const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error('Missing credentials');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function checkUser() {
    console.log('Checking parts-loadtest-v4@envirojim.com...');

    // 1. Get Auth User
    const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();
    // listUsers paginates? Filter by email not supported directly via listUsers in some versions?
    // Actually listUsers() returns list.
    const authUser = users.find(u => u.email === 'parts-loadtest-v4@envirojim.com');

    if (!authUser) {
        console.error('❌ Auth User NOT FOUND.');
        process.exit(1);
    }

    console.log('✅ Auth User Found:', authUser.id);
    console.log('Metadata:', authUser.user_metadata, authUser.app_metadata);

    // 2. Check Public User
    const { data: publicUser, error: publicError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle(); // Use maybeSingle to avoid error on empty

    if (publicError) {
        console.error('❌ Public User Query Failed:', publicError);
    } else if (!publicUser) {
        console.error('❌ Public User NOT FOUND (Sync Trigger Failed?)');
    } else {
        console.log('✅ Public User Found:', publicUser.id);
        console.log('Role:', publicUser.role);
        console.log('Org:', publicUser.organization_id);
    }
}

checkUser();
