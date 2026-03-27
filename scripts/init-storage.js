const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env.local') });

const connectionString =
  process.env.POSTGRES_URL ||
  process.env.DATABASE_URL ||
  'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

async function main() {
  const client = new Client({ connectionString });

  try {
    await client.connect();
    console.log('--- ENVIROJIM STORAGE INIT ---');

    const buckets = [
      { id: 'documents', name: 'documents', public: true },
      { id: 'avatars', name: 'avatars', public: true },
      { id: 'machine-images', name: 'machine-images', public: true }
    ];

    for (const bucket of buckets) {
      await client.query(
        `
        INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (id) DO UPDATE
        SET
          name = EXCLUDED.name,
          public = EXCLUDED.public,
          file_size_limit = EXCLUDED.file_size_limit,
          allowed_mime_types = EXCLUDED.allowed_mime_types;
        `,
        [
          bucket.id,
          bucket.name,
          bucket.public,
          52428800,
          ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg']
        ]
      );

      console.log(`✅ Bucket ready: ${bucket.id}`);
    }

    console.log('✅ STORAGE INIT COMPLETE');
  } catch (error) {
    console.error('❌ STORAGE INIT FAILED:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
