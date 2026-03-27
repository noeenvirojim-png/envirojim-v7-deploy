import { createAdminClient } from '../src/lib/supabase/admin';
import { processManualIngestionPipeline } from '../src/domain/ai/pipelines/ingestion-pipeline';
import * as fs from 'fs';
import * as path from 'path';

require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

const PDF_DIR = 'C:\\Users\\Noé EVE\\OneDrive - Envirojim\\Bureau\\VB750 DK -1208 Instructions de service';
const ORG_ID = '00000000-0000-0000-0000-000000000001';

async function audit() {
    console.log('🚀 Starting Atomic AI Audit...');
    const supabase = createAdminClient();

    // 1. Seed Machine
    console.log('📦 Seeding machine...');
    await supabase.from('machines').upsert({
        id: 'm1',
        organization_id: ORG_ID,
        serial_number: 'VB750DK-1208',
        name: 'VB750 DK',
        make: 'EnviroJim',
        model: 'VB750 DK'
    });

    // 2. Seed Manuals
    console.log('🌱 Seeding manuals...');
    const files = fs.readdirSync(PDF_DIR).filter(f => f.endsWith('.pdf'));
    for (const file of files) {
        await supabase.from('manuals').upsert({
            organization_id: ORG_ID,
            machine_id: 'm1',
            title: file,
            file_url: file
        });
    }

    // 3. Trigger Ingestion
    const testFiles = files.slice(0, 1);
    console.log(`⚙️  Processing ${testFiles.length} manual(s) for audit...`);
    for (const file of testFiles) {
        console.log(`▶️  Ingesting: ${file}`);
        try {
            await processManualIngestionPipeline('m1', file, ORG_ID);
        } catch (err) {
            console.error(`❌ Error ingesting ${file}:`, err);
        }
    }

    // 4. Verify Chunks
    const { data: chunks } = await supabase.from('manual_chunks').select('id').eq('machine_id', 'm1');
    console.log(`📊 Total Chunks Generated: ${chunks?.length || 0}`);
    
    if (chunks && chunks.length > 0) {
        console.log('✅ AI Guidance Engine Audit PASSED.');
    } else {
        console.log('❌ AI Guidance Engine Audit FAILED: No chunks generated.');
    }
}

audit().catch(console.error);
