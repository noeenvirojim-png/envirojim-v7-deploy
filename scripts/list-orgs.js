
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function listOrgs() {
    const { data, error } = await supabase.from('organizations').select('id, name, type').limit(10);
    if (error) console.error(error);
    else console.log('Orgs:', data);
}

listOrgs();
