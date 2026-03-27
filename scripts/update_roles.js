
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function updateRoles() {
    const updates = [
        { email: 'manager@acmemining.com', role: 'CLIENT_ADMIN' }, // Was ORG_ADMIN
        { email: 'operator@acmemining.com', role: 'OPERATOR' },
        { email: 'admin@northernsp.com', role: 'SERVICE_PROVIDER_ADMIN' } // Was ORG_ADMIN
    ];

    for (const update of updates) {
        console.log(`Updating ${update.email} to ${update.role}...`);
        const { error } = await supabase
            .from('users')
            .update({ role: update.role })
            .eq('email', update.email);

        if (error) {
            console.error(`Error updating ${update.email}:`, error.message);
        } else {
            console.log(`Success.`);
        }
    }
}

updateRoles();
