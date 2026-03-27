// PHASE 1 - AUTHENTICATION TEST WITH REAL USER
// Tests login with seeded user credentials

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
            envVars[key.trim()] = valueParts.join('=').trim();
        }
    }
});

const SUPABASE_URL = envVars.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function testRealUserAuth() {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('PHASE 1 - REAL USER AUTHENTICATION TEST');
    console.log('Timestamp:', new Date().toISOString());
    console.log('═══════════════════════════════════════════════════════════\n');

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Test with seeded user: noe@envirojim.com
    const testEmail = 'noe@envirojim.com';
    const testPassword = 'EnviroJim2024!'; // Common default password

    console.log('🔐 Testing login with seeded user:', testEmail);
    console.log('Note: This test requires the user to exist in Supabase Auth\n');

    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: testEmail,
            password: testPassword,
        });

        if (error) {
            console.log('❌ Login Failed');
            console.log('Error Code:', error.code);
            console.log('Error Message:', error.message);
            console.log('\n📋 DIAGNOSIS:');

            if (error.code === 'invalid_credentials') {
                console.log('- User may not exist in Supabase Auth');
                console.log('- Or password is incorrect');
                console.log('- Check if seed data was applied to Supabase Auth');
            }

            return {
                status: 'FAIL',
                error: error.message,
                errorCode: error.code,
                diagnosis: 'User authentication failed - check Supabase Auth setup'
            };
        }

        console.log('✅ Login Successful!');
        console.log('User ID:', data.user.id);
        console.log('Email:', data.user.email);
        console.log('Session Token Length:', data.session.access_token.length);
        console.log('Session Expires:', new Date(data.session.expires_at * 1000).toISOString());

        // Test fetching user profile
        console.log('\n🔍 Fetching user profile from database...');
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('id', data.user.id)
            .single();

        if (userError) {
            console.log('⚠️  Warning: Could not fetch user profile');
            console.log('Error:', userError.message);
        } else if (!userData) {
            console.log('⚠️  Warning: User exists in Auth but not in users table');
        } else {
            console.log('✅ User Profile Found');
            console.log('Full Name:', userData.full_name);
            console.log('Role:', userData.role);
            console.log('Org ID:', userData.org_id);
        }

        return {
            status: 'PASS',
            userId: data.user.id,
            email: data.user.email,
            sessionTokenLength: data.session.access_token.length,
            userProfile: userData
        };

    } catch (error) {
        console.log('❌ Unexpected Error:', error.message);
        return {
            status: 'FAIL',
            error: error.message
        };
    }
}

testRealUserAuth()
    .then((result) => {
        console.log('\n═══════════════════════════════════════════════════════════');
        console.log('RESULT:', result.status);
        console.log('═══════════════════════════════════════════════════════════\n');
        console.log('📄 JSON Result:\n');
        console.log(JSON.stringify(result, null, 2));

        const outputPath = path.join(__dirname, '..', 'PHASE1_AUTH_TEST.json');
        fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
        console.log(`\n📁 Results saved to: ${outputPath}`);

        process.exit(result.status === 'PASS' ? 0 : 1);
    })
    .catch((error) => {
        console.error('FATAL ERROR:', error);
        process.exit(1);
    });
