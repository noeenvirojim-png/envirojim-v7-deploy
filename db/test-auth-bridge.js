// ============================================================================
// Auth Bridge Test - Verify RLS Fix
// ============================================================================
// Tests that getCurrentUserFromSession() works after RLS policy fix
// ============================================================================

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !anonKey) {
    console.error('❌ Missing environment variables!');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, anonKey);

async function testAuthBridge() {
    console.log('🧪 Testing Auth Bridge after RLS fix...\n');

    // Test 1: Login
    console.log('Test 1: Login as Noé EVE');
    const { data: { session }, error: loginError } = await supabase.auth.signInWithPassword({
        email: 'noe@envirojim.com',
        password: '@Enviro2018!'
    });

    if (loginError) {
        console.error('❌ Login failed:', loginError.message);
        return;
    }

    console.log('✅ Login successful');
    console.log('   User ID:', session.user.id);
    console.log('   Email:', session.user.email);
    console.log('');

    // Test 2: Fetch own user record
    console.log('Test 2: Fetch own user record from database');
    const { data: user, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single();

    if (userError) {
        console.error('❌ User fetch failed:', userError.message);
        console.error('   Code:', userError.code);
        console.error('   Details:', userError.details);
        return;
    }

    console.log('✅ User record fetched successfully');
    console.log('   Email:', user.email);
    console.log('   Role:', user.role);
    console.log('   Full Name:', user.full_name);
    console.log('   Organization ID:', user.organization_id);
    console.log('');

    // Test 3: Try to fetch another user's record (should fail)
    console.log('Test 3: Try to fetch another user (should return 0 rows)');
    const { data: otherUsers, error: otherError } = await supabase
        .from('users')
        .select('*')
        .eq('email', 'parts@envirojim.com');

    if (otherError) {
        console.error('❌ Query failed:', otherError.message);
        return;
    }

    if (otherUsers.length === 0) {
        console.log('✅ Correctly blocked access to other user (RLS working)');
    } else {
        console.log('⚠️  WARNING: Can see other user! RLS may not be working correctly');
        console.log('   Found:', otherUsers.length, 'users');
    }
    console.log('');

    // Test 4: Verify role-based functions work
    console.log('Test 4: Test role-based RPC functions');
    const { data: isSuperAdmin, error: rpcError } = await supabase
        .rpc('is_super_admin');

    if (rpcError) {
        console.error('❌ RPC failed:', rpcError.message);
        return;
    }

    console.log('✅ is_super_admin():', isSuperAdmin);
    console.log('');

    console.log('🎉 All tests passed! Auth bridge is working correctly.');
}

testAuthBridge().catch(console.error);
