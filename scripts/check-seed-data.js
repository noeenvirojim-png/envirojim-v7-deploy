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

const ORG_ID = '00000000-0000-0000-0000-000000000001';

async function checkAndSeed() {
    console.log(`🔍 Checking for Organization ${ORG_ID}...`);

    const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', ORG_ID)
        .maybeSingle();

    if (error) {
        console.error('❌ Error checking org:', error);
        process.exit(1);
    }

    if (data) {
        console.log('✅ Organization exists:', data.name);
    } else {
        console.log('⚠️ Organization MISSING. Seeding...');
        const { error: insertError } = await supabase
            .from('organizations')
            .insert({
                id: ORG_ID,
                name: 'EnviroJim HQ (Test Seed)',
                type: 'ENVIROJIM'
            });

        if (insertError) {
            console.error('❌ Failed to seed org:', insertError);
            process.exit(1);
        }
        console.log('✅ Organization seeded successfully.');
    }
}

checkAndSeed();
