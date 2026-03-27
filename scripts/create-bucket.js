const { createClient } = require('@supabase/supabase-js');

async function createBucket() {
  const supabaseUrl = 'http://127.0.0.1:54321';
  const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.ENRFwDnwh8TYL14sws85HmY19NZlgdXyC6LKSuDLma0';

  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data, error } = await supabase.storage.createBucket('machine-documents', {
    public: false,
    allowedMimeTypes: ['application/pdf'],
    fileSizeLimit: 52428800 // 50MB
  });

  if (error) {
    if (error.message.includes('already exists')) {
      console.log('✅ Bucket "machine-documents" already exists.');
    } else {
      console.error('❌ Failed to create bucket:', error.message);
      process.exit(1);
    }
  } else {
    console.log('✅ Bucket "machine-documents" created successfully!');
  }
}

createBucket();
