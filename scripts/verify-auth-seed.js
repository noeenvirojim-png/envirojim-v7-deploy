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

    const authUser = await client.query(`
      SELECT id, email
      FROM auth.users
      WHERE email = 'noe@envirojim.com'
      LIMIT 1
    `);

    const identity = await client.query(`
      SELECT id, user_id, provider, provider_id
      FROM auth.identities
      WHERE provider = 'email'
        AND provider_id = 'noe@envirojim.com'
      LIMIT 1
    `);

    const publicUser = await client.query(`
      SELECT id, email, role, organization_id
      FROM public.users
      WHERE email = 'noe@envirojim.com'
      LIMIT 1
    `);

    console.log('--- VERIFY AUTH SEED ---');
    console.log(`auth.users: ${authUser.rowCount === 1 ? 'PRESENT' : 'MISSING'}`);
    console.log(`auth.identities: ${identity.rowCount === 1 ? 'PRESENT' : 'MISSING'}`);
    console.log(`public.users: ${publicUser.rowCount === 1 ? 'PRESENT' : 'MISSING'}`);

    if (
      authUser.rowCount !== 1 ||
      identity.rowCount !== 1 ||
      publicUser.rowCount !== 1
    ) {
      console.error('❌ AUTH SEED INVALID');
      process.exit(1);
    }

    if (authUser.rows[0].id !== publicUser.rows[0].id) {
      console.error('❌ AUTH/PUBLIC USER ID MISMATCH');
      process.exit(1);
    }

    if (identity.rows[0].user_id !== authUser.rows[0].id) {
      console.error('❌ AUTH IDENTITY USER LINK MISMATCH');
      process.exit(1);
    }

    console.log('✅ AUTH SEED VALID');
  } catch (error) {
    console.error('❌ VERIFY AUTH SEED FAILED:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
