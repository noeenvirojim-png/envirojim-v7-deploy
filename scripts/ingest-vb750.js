const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const PDF_DIR = 'C:\\Users\\Noé EVE\\OneDrive - Envirojim\\Bureau\\VB750 DK -1208 Instructions de service';
const ORG_ID = '00000000-0000-0000-0000-000000000001';

async function ingest() {
    console.log('🚀 Starting VB750 DK Ingestion...');

    // 1. Ensure Machine exists
    console.log('📦 Ensuring machine exists...');
    const machinePayload = {
        organization_id: ORG_ID,
        serial_number: 'VB750DK-1208',
        make: 'EnviroJim',
        model: 'VB750 DK'
    };
    
    const { data: mData, error: mError } = await supabase.from('machines').upsert(machinePayload, { onConflict: 'organization_id,serial_number' }).select('id');
    if (mError) throw mError;
    
    let machineId = mData?.[0]?.id;
    if (!machineId) {
        const { data: sData } = await supabase.from('machines').select('id').eq('serial_number', 'VB750DK-1208').single();
        machineId = sData.id;
    }
    console.log('✅ Machine ID:', machineId);

    // 2. Ensure Buckets exist
    console.log('🪣 Ensuring buckets exist...');
    await supabase.storage.createBucket('manuals', { public: true }).catch(() => {});
    await supabase.storage.createBucket('pdf-uploads', { public: true }).catch(() => {});

    // 3. Upload PDFs
    const files = fs.readdirSync(PDF_DIR).filter(f => f.endsWith('.pdf'));
    console.log(`📄 Found ${files.length} PDFs to upload.`);

    for (const file of files) {
        console.log(`📤 Uploading ${file}...`);
        const filePath = path.join(PDF_DIR, file);
        const buffer = fs.readFileSync(filePath);
        
        const { error: uError } = await supabase.storage.from('manuals').upload(file, buffer, {
            upsert: true,
            contentType: 'application/pdf'
        });

        if (uError) {
            console.error(`❌ Upload failed for ${file}:`, uError.message);
            continue;
        }

        // 4. Register Manual Entry
        await supabase.from('manuals').upsert({
            organization_id: ORG_ID,
            machine_id: machineId,
            title: file,
            file_url: file
        }, { onConflict: 'organization_id,file_url' });
    }

    console.log('🎉 Bulk upload complete. Manuals are ready for AI processing.');
}

ingest().catch(console.error);
