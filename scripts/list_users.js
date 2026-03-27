
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkUsers() {
    const { data: publicUsers } = await supabase.from('users').select('id, email, role');
    const { data: { users: authUsers } } = await supabase.auth.admin.listUsers();

    const result = {
        publicUsers,
        authUsers: authUsers.map(u => ({
            id: u.id,
            email: u.email,
            role: u.app_metadata?.role,
            org_id: u.app_metadata?.org_id
        }))
    };

    console.log(JSON.stringify(result, null, 2));
}

checkUsers();
