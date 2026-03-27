
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function initStorage() {
    console.log('Initializing Storage Buckets...');

    const buckets = ['documents', 'avatars', 'machine-images'];

    for (const bucket of buckets) {
        const { data, error } = await supabase.storage.getBucket(bucket);

        if (error && error.message.includes('not found')) {
            console.log(`Creating bucket: ${bucket}`);
            const { error: createError } = await supabase.storage.createBucket(bucket, {
                public: true, // Make documents public for now to simplify access
                fileSizeLimit: 52428800, // 50MB
                allowedMimeTypes: ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg']
            });
            if (createError) {
                console.error(`Failed to create bucket ${bucket}:`, createError);
            } else {
                console.log(`Bucket ${bucket} created.`);
            }
        } else if (data) {
            console.log(`Bucket ${bucket} already exists.`);
        } else {
            console.error(`Error checking bucket ${bucket}:`, error);
        }
    }
}

initStorage().catch(console.error);
