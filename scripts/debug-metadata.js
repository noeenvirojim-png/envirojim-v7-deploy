
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Need service role to see auth users easily

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkMetadata() {
    const { data: { users }, error } = await supabase.auth.admin.listUsers();

    if (error) {
        console.error('Error listing users:', error);
        return;
    }

    users.forEach(user => {
        console.log(`User: ${user.email}`);
        console.log(`  Role (Metadata): ${user.app_metadata?.role || user.user_metadata?.role || 'MISSING'}`);
        console.log(`  App Metadata: ${JSON.stringify(user.app_metadata)}`);
        console.log(`  User Metadata: ${JSON.stringify(user.user_metadata)}`);
        console.log('---');
    });
}

checkMetadata();
