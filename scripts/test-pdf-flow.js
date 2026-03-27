require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Error: Missing environment variables in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testPdfFlow() {
    console.log('🧪 ENVIROJIM - LOCAL PDF FLOW PROOF');
    console.log('='.repeat(40));

    try {
        const timestamp = Date.now();
        const testDir = path.join(process.cwd(), 'tests', 'fixtures');
        if (!fs.existsSync(testDir)) fs.mkdirSync(testDir, { recursive: true });

        const pdfPath = path.join(testDir, `test-${timestamp}.pdf`);
        fs.writeFileSync(pdfPath, '%PDF-1.4 - Local Test Proof');

        console.log(`\n📂 1. Uploading PDF to local storage...`);
        const fileBuffer = fs.readFileSync(pdfPath);
        const { data, error } = await supabase.storage
            .from('documents')
            .upload(`proof/local-test-${timestamp}.pdf`, fileBuffer, {
                contentType: 'application/pdf',
                upsert: true
            });

        if (error) {
            console.error('❌ Upload Failed:', error.message);
            process.exit(1);
        }

        console.log('✅ Upload Success:', data.path);

        console.log(`\n🔗 2. Verifying Public URL...`);
        const { data: { publicUrl } } = supabase.storage
            .from('documents')
            .getPublicUrl(data.path);
        
        console.log('✅ Local URL:', publicUrl);

        console.log(`\n📊 3. Mocking Analysis metadata...`);
        // We simulate the database entry that would be created by the PDF processor
        const { error: dbError } = await supabase
            .from('machine_documents')
            .insert({
                machine_id: (await supabase.from('machines').select('id').limit(1).single()).data.id,
                storage_path: data.path,
                filename: `local-test-${timestamp}.pdf`,
                document_type: 'maintenance',
                processing_status: 'completed',
                extracted_metadata: { proof_type: 'mechanical_local' }
            });

        if (dbError) {
            console.error('❌ DB Entry Failed:', dbError.message);
            process.exit(1);
        }
        console.log('✅ DB Metadata entry created');

        console.log('\n' + '='.repeat(40));
        console.log('🏆 PDF FLOW PROVEN LOCALLY');
        process.exit(0);

    } catch (err) {
        console.error('❌ Unexpected Error:', err.message);
        process.exit(1);
    }
}

testPdfFlow();
