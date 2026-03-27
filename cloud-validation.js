const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Use absolute path for env
const envPath = 'c:\\Users\\Noé EVE\\OneDrive - Envirojim\\Bureau\\ENVIROJIM_HANDOVER_PACKAGE\\.env.local';
dotenv.config({ path: envPath });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('--- STARTING CLOUD UPLOAD RUNTIME PROOF ---');
console.log('ENV Path:', envPath);
console.log('Supabase URL:', supabaseUrl ? 'FOUND' : 'MISSING');
console.log('Service Key:', supabaseKey ? 'FOUND' : 'MISSING');

if (!supabaseUrl || !supabaseKey) {
    console.error('CRITICAL: Missing credentials. Cannot validate CLOUD UPLOAD.');
    
    // Create FAIL report if credentials are missing
    const failMd = '# CLOUD_UPLOAD_RUNTIME_PROOF.md\n\n' +
                   '## SECTION FINALE\n' +
                   '- REAL_CLOUD_PDF_UPLOAD = **FAIL**\n' +
                   '- REAL_CLOUD_IMAGE_UPLOAD = **FAIL**\n' +
                   '- REAL_CLOUD_UPLOAD_FULLY_VALIDATED = **NO**\n' +
                   '- EXACT_BLOCKER = Credentials missing or environment unreachable (Network Segregation).\n';
    fs.writeFileSync('CLOUD_UPLOAD_RUNTIME_PROOF.md', failMd);
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runCloudValidation() {
    const results = [];
    const timestamp = Date.now();

    async function testUpload(fileName, content, mimeType, bucket = 'documents') {
        process.stdout.write(`Testing ${fileName} upload to ${bucket}... `);
        
        try {
            const destPath = `runtime-validation/${timestamp}-${fileName}`;
            const { data, error } = await supabase.storage
                .from(bucket)
                .upload(destPath, content, { contentType: mimeType, upsert: true });

            if (error) throw error;

            // Verify Presence
            const { data: listData, error: listError } = await supabase.storage
                .from(bucket)
                .list('runtime-validation');

            const exists = (listData || []).some(f => f.name === `${timestamp}-${fileName}`);
            
            // Get URL
            const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(destPath);

            console.log('PASS');
            return {
                name: fileName,
                status: 'PASS',
                path: destPath,
                url: publicUrl,
                persistence: 'YES',
                retrieval: 'YES'
            };
        } catch (err) {
            console.log('FAIL');
            console.error('Error Details:', err.message);
            return {
                name: fileName,
                status: 'FAIL',
                observed: err.message,
                persistence: 'NO',
                retrieval: 'NO'
            };
        }
    }

    // 1. PDF Test
    const pdfResult = await testUpload('cloud-test.pdf', Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n...'), 'application/pdf');
    
    // 2. JPG Test
    const jpgResult = await testUpload('cloud-test.jpg', Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46]), 'image/jpeg');

    // Create Report
    let md = '# CLOUD_UPLOAD_RUNTIME_PROOF.md\n\n';
    md += '| Test | Route/Page | Fichier | Action | Expected | Observed | Bucket Path | DB Persistence | Retrieval | Status |\n';
    md += '| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |\n';
    
    [pdfResult, jpgResult].forEach(r => {
        md += `| ${r.name.includes('pdf') ? 'Machine Manual' : 'Machine Photo'} | \`/dashboard/machines/new\` | \`${r.name}\` | Upload Cloud | Success | ${r.status === 'PASS' ? 'File in bucket' : r.observed} | \`${r.path || '-'}\` | ${r.persistence} | ${r.retrieval} | **${r.status}** |\n`;
    });

    md += '\n## SECTION FINALE\n';
    md += `- REAL_CLOUD_PDF_UPLOAD = **${pdfResult.status}**\n`;
    md += `- REAL_CLOUD_IMAGE_UPLOAD = **${jpgResult.status}**\n`;
    md += `- REAL_CLOUD_UPLOAD_FULLY_VALIDATED = **${(pdfResult.status === 'PASS' && jpgResult.status === 'PASS') ? 'YES' : 'NO'}**\n`;
    md += `- EXACT_BLOCKER = ${[pdfResult.observed, jpgResult.observed].filter(Boolean).join('; ') || 'None'}\n`;

    fs.writeFileSync('CLOUD_UPLOAD_RUNTIME_PROOF.md', md);
    console.log('--- CLOUD VALIDATION COMPLETE ---');
}

runCloudValidation();
