
/* eslint-disable */
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
    console.error('Missing credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function testOnboardingLink() {
    try {
        console.log('--- V8 Production Onboarding Test ---');
        
        // 1. Ensure Orgnization
        const { data: org } = await supabase.from('organizations').select('id').eq('id', '00000000-0000-0000-0000-000000000001').single();
        if (!org) {
            console.error('Root organization missing');
            return;
        }

        // 2. Create Test Client
        const testClientId = crypto.randomUUID();
        const { error: clientError } = await supabase.from('clients').upsert({
            id: testClientId,
            name: 'Test Client V8',
            email: 'noe@envirojim.com', // Using owner email for test
            owner_org_id: org.id,
            status: 'PENDING'
        });

        if (clientError) {
            console.error('Error creating client:', clientError.message);
            return;
        }

        // 3. Generate Token
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

        const { error: tokenError } = await supabase.from('client_oauth_tokens').insert({
            client_id: testClientId,
            token,
            expires_at: expiresAt.toISOString()
        });

        if (tokenError) {
            console.error('Error creating token:', tokenError.message);
            return;
        }

        console.log('✅ Token Generated Successfully');
        console.log('Client ID:', testClientId);
        console.log('Token:', token);
        console.log('Onboarding Link: https://envirojim-final-deployment.vercel.app/oauth/login?token=' + token);
        
    } catch (err) {
        console.error('Unexpected error:', err);
    }
}

testOnboardingLink();
