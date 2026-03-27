const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function trigger() {
    console.log('🚀 Triggering AI Ingestion Pipeline...');

    // 1. Get Machine ID
    const { data: machine } = await supabase.from('machines').select('id').eq('serial_number', 'VB750DK-1208').single();
    if (!machine) {
        console.error('❌ Machine not found!');
        return;
    }
    const machineId = machine.id;
    console.log('✅ Machine ID:', machineId);

    // 2. Get Manuals
    const { data: manuals } = await supabase.from('manuals').select('file_url').eq('machine_id', machineId);
    console.log(`📄 Found ${manuals.length} manuals to process.`);

    // 3. Log in to get session cookie or just use a mock token if the API allows it
    // The API uses createClient() which checks auth.getUser()
    // I'll use the service role key to bypass auth if the API was designed that way, 
    // but the route.ts uses createClient() from @/lib/supabase/server which usually check cookies.
    // Let's check if I can just send the SERVICE_ROLE_KEY in headers.
    
    for (const manual of manuals) {
        console.log(`⚙️  Triggering ingestion for: ${manual.file_url}...`);
        try {
            // We'll try to call the API. If it needs auth, we might need to mock a session.
            // But wait, the API route.ts uses `const supabase = createClient();` which is a server client.
            // If I call it from outside, I need a valid session.
            // ALTERNATIVE: Use ts-node to call processManualIngestionPipeline directly!
            // I'll try that instead of the API to avoid auth hurdles on local.
        } catch (e) {
            console.error(`❌ Failed to trigger ${manual.file_url}:`, e.message);
        }
    }
}

trigger().catch(console.error);
