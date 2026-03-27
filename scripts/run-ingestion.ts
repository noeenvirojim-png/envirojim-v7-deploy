import { processManualIngestionPipeline } from '../src/domain/ai/pipelines/ingestion-pipeline';
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const ORG_ID = '00000000-0000-0000-0000-000000000001';

async function run() {
    console.log('🚀 Starting Direct AI Ingestion...');

    let { data: machine, error: err } = await supabase.from('machines').select('id').eq('serial_number', 'VB750DK-1208').single();
    if (err || !machine || !machine.id) {
        console.log('⚠️  Machine not found by serial, trying by name... (or selection failed)', err);
        const { data: m2 } = await supabase.from('machines').select('id').eq('name', 'VB750 DK').single();
        if (m2 && m2.id) machine = m2;
        else {
            console.log('Falling back to hardcoded ID m1');
            machine = { id: 'm1' };
        }
    }
    console.log('✅ Target Machine Object:', JSON.stringify(machine));

    const { data: manuals, error: mErr } = await supabase.from('manuals').select('*').eq('machine_id', machine.id);
    if (mErr) console.error('❌ Manuals Error:', mErr);
    console.log(`📄 Found ${manuals?.length || 0} manuals for this machine.`);

    for (const manual of manuals) {
        console.log(`⚙️  Processing: ${manual.file_url}...`);
        try {
            await processManualIngestionPipeline(machine.id, manual.file_url, ORG_ID);
            console.log(`✅ Success: ${manual.file_url}`);
        } catch (e) {
            console.error(`❌ Failed: ${manual.file_url}`, e);
        }
    }
    console.log('🎉 All manuals processed.');
}

run().catch(console.error);
