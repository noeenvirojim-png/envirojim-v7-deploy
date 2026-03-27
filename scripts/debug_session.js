require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Quick debug script to inspect actual session structure
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function debugSession() {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const { data, error } = await supabase.auth.signInWithPassword({
        email: 'noe@envirojim.com',
        password: 'EnviroJim2024!'
    });

    if (error) {
        console.error('Login failed:', error);
        return;
    }

    console.log('Session object structure:');
    console.log(JSON.stringify(data.session, null, 2));

    console.log('\nSession keys:', Object.keys(data.session));
    console.log('Has refresh_token?', !!data.session.refresh_token);
    console.log('Refresh token value:', data.session.refresh_token);
}

debugSession();
