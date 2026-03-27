
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function seedDiagnosis() {
    // 1. Check if nodes exist
    const { count, error } = await supabase.from('diagnostic_nodes').select('*', { count: 'exact', head: true });

    if (count > 0) {
        console.log(`Diagnostic nodes already exist (${count}). Skipping seed.`);
        return;
    }

    console.log('Seeding diagnostic nodes...');

    // 2. Create Root Node
    const { data: root, error: rootError } = await supabase.from('diagnostic_nodes').insert({
        content: 'What is the primary symptom?',
        node_type: 'question'
    }).select().single();

    if (rootError) {
        console.error('Error creating root:', rootError.message);
        return;
    }
    console.log(`Root created: ${root.id}`);

    // 3. Create Options
    const { error: optError } = await supabase.from('diagnostic_options').insert([
        {
            node_id: root.id,
            label: 'Engine will not start',
            next_node_id: null // Terminal for now or create next node
        },
        {
            node_id: root.id,
            label: 'Hydraulic leak',
            next_node_id: null
        }
    ]);

    if (optError) console.error('Error creating options:', optError.message);
    else console.log('Options created.');
}

seedDiagnosis();
