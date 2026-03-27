const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(process.cwd(), '.env.local') });

async function auditUsers() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        console.error('Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.');
        process.exit(1);
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });

    console.log('--- ENVIROJIM USER AUDIT ---');

    // 1. Fetch all auth users
    const { data: { users: authUsers }, error: authError } = await supabase.auth.admin.listUsers();
    if (authError) {
        console.error('Failed to list auth users:', authError.message);
        process.exit(1);
    }

    // 2. Fetch all public profile users
    const { data: publicUsers, error: publicError } = await supabase
        .from('users')
        .select('id, email, role');
    
    if (publicError) {
        console.error('Failed to list public users:', publicError.message);
        process.exit(1);
    }

    const publicUserIds = new Set(publicUsers.map(u => u.id));
    const mismatches = [];

    console.log(`Auth Users: ${authUsers.length}`);
    console.log(`Public Users: ${publicUsers.length}`);

    authUsers.forEach(authUser => {
        if (!publicUserIds.has(authUser.id)) {
            mismatches.push({
                id: authUser.id,
                email: authUser.email,
                status: 'MISSING_PUBLIC_PROFILE'
            });
        }
    });

    if (mismatches.length === 0) {
        console.log('✅ PASS: All auth users have public profiles.');
    } else {
        console.warn(`⚠️ FAIL: Found ${mismatches.length} mismatches.`);
        console.table(mismatches);
    }

    console.log('--- AUDIT COMPLETE ---');
}

auditUsers();
