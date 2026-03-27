
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function inspect() {
    const { data, error } = await supabase
        .from('checklists')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error fetching checklists:', error);
        return;
    }

    if (!data || data.length === 0) {
        console.log('No data in checklists table to inspect.');
    } else {
        console.log('Columns in checklists table:', Object.keys(data[0]));
    }
}

inspect();
