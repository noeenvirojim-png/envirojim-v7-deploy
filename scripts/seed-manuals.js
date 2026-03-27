const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const PDF_DIR = 'C:\\Users\\Noé EVE\\OneDrive - Envirojim\\Bureau\\VB750 DK -1208 Instructions de service';
const ORG_ID = '00000000-0000-0000-0000-000000000001';

async function seed() {
    console.log('🌱 Seeding manuals table...');
    const files = fs.readdirSync(PDF_DIR).filter(f => f.endsWith('.pdf'));
    
    for (const file of files) {
        const { error } = await supabase.from('manuals').upsert({
            organization_id: ORG_ID,
            machine_id: 'm1',
            title: file,
            file_url: file
        }, { onConflict: 'organization_id,file_url' });
        
        if (error) console.error(`❌ Failed ${file}:`, error.message);
        else console.log(`✅ Seeded ${file}`);
    }
}

seed().catch(console.error);
