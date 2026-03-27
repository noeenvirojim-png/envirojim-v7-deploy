const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const EMAIL = 'parts@envirojim.com';
const PASSWORD = 'EnviroJim2024!';

async function capture() {
    console.log('🚀 [JWT CAPTURE] Attempting cloud-originated session...');
    const supabase = createClient(SUPABASE_URL, ANON_KEY);

    const { data, error } = await supabase.auth.signInWithPassword({
        email: EMAIL,
        password: PASSWORD
    });

    if (error) {
        console.error('❌ Login failed:', error.message);
        process.exit(1);
    }

    const session = data.session;
    const token = session.access_token;

    // Extract claims (Base64 decode)
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());

    console.log('--- AUDIT PROOF: JWT CAPTURED ---');
    console.log('Token (Truncated):', token.substring(0, 20) + '...');
    console.log('Payload:', JSON.stringify(payload, null, 2));
    console.log('-------------------------------');

    process.exit(0);
}

capture();
