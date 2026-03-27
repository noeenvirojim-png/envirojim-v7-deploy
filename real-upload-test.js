const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabase = createClient(
    'https://ptznkpenefqhackdeau.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB0em5rcGVuZXFmcWhhY2tkZWF1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTE4MTg5NiwiZXhwIjoyMDg2NzU3ODk2fQ.48bpC4klZ9p4J-pOg2im3LnFi2BCJCiN8ToFmkrmgTs'
);

async function test() {
    console.log('--- STARTING REAL UPLOAD PROOF ---');
    try {
        const timestamp = Date.now();
        
        // Ensure test files are in the right place
        const scriptsDir = path.join(__dirname, 'scripts');
        const pdfSource = path.join(scriptsDir, 'test.pdf');
        const jpgSource = path.join(scriptsDir, 'test.jpg');

        if (!fs.existsSync(pdfSource)) {
            console.log('Creating PDF source...');
            fs.writeFileSync(pdfSource, '%PDF-1.4');
        }
        if (!fs.existsSync(jpgSource)) {
            console.log('Creating JPG source...');
            fs.writeFileSync(jpgSource, Buffer.from([0xFF, 0xD8, 0xFF]));
        }

        // 1. PDF Upload
        console.log('Uploading PDF...');
        const pdfFile = fs.readFileSync(pdfSource);
        const pdfDest = `proof/test-${timestamp}.pdf`;
        const { data: pdfData, error: pdfError } = await supabase.storage
            .from('documents')
            .upload(pdfDest, pdfFile, { contentType: 'application/pdf', upsert: true });
        
        if (pdfError) {
            console.error('PDF Upload Error:', pdfError.message);
        } else {
            console.log('PDF Upload Status: SUCCESS');
            console.log('PDF Path:', pdfData.path);
            const { data: { publicUrl: pdfUrl } } = supabase.storage.from('documents').getPublicUrl(pdfDest);
            console.log('PDF Public URL:', pdfUrl);
        }

        // 2. JPG Upload
        console.log('Uploading JPG...');
        const jpgFile = fs.readFileSync(jpgSource);
        const jpgDest = `proof/test-${timestamp}.jpg`;
        const { data: jpgData, error: jpgError } = await supabase.storage
            .from('documents')
            .upload(jpgDest, jpgFile, { contentType: 'image/jpeg', upsert: true });

        if (jpgError) {
            console.error('JPG Upload Error:', jpgError.message);
        } else {
            console.log('JPG Upload Status: SUCCESS');
            console.log('JPG Path:', jpgData.path);
            const { data: { publicUrl: jpgUrl } } = supabase.storage.from('documents').getPublicUrl(jpgDest);
            console.log('JPG Public URL:', jpgUrl);
        }
        
    } catch (err) {
        console.error('Unexpected Script Error:', err.message);
    }
    console.log('--- END OF PROOF ---');
}

test();
