
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function verifyAuthSession() {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const email = 'noe@envirojim.com';
    const password = '@Enviro2018!';

    console.log(`--- Verifying Login for ${email} ---`);

    // Login to get a session
    const { data: { session }, error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password
    });

    if (loginError) {
        console.error('❌ Login Error:', loginError.message);
        return;
    }

    console.log('✅ Login Successful');
    console.log('Access Token:', session.access_token.substring(0, 20) + '...');

    // Now get user as the user themselves
    const userClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        {
            global: { headers: { Authorization: `Bearer ${session.access_token}` } }
        }
    );

    const { data: { user }, error: userError } = await userClient.auth.getUser();

    if (userError) {
        console.error('❌ GetUser Error:', userError.message);
        return;
    }

    console.log('\n--- User Metadata Received by Client ---');
    console.log('ID:', user.id);
    console.log('App Metadata:', JSON.stringify(user.app_metadata, null, 2));
    console.log('User Metadata:', JSON.stringify(user.user_metadata, null, 2));

    const role = user.app_metadata?.role || user.user_metadata?.role;
    console.log('\nResolved Role:', role || 'MISSING');

}

verifyAuthSession();
