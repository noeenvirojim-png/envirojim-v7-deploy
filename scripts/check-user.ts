
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkUser(email: string) {
    console.log(`Checking for ${email}...`);
    const { data: { users }, error } = await supabase.auth.admin.listUsers();

    if (error) {
        console.error('Error listing users:', error);
        return;
    }

    const user = users.find(u => u.email === email);
    if (user) {
        console.log(`✅ User ${email} FOUND:`, user.id);

        // Also check if they are in public.users
        const { data: publicUser, error: publicError } = await supabase
            .from('users')
            .select('*')
            .eq('id', user.id)
            .single();

        if (publicError || !publicUser) {
            console.error(`❌ User ${email} MISSING from public.users table!`);
        } else {
            console.log(`✅ User ${email} FOUND in public.users role=${publicUser.role}`);
        }

    } else {
        console.error(`❌ User ${email} NOT FOUND in Auth.`);
    }
}

async function main() {
    await checkUser('noe@envirojim.com');
    await checkUser('tech@northernsp.com');
}

main();
