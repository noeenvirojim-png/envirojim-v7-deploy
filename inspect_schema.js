const { Client } = require('pg');

async function inspectSchema() {
  const client = new Client({
    host: 'localhost',
    port: 55322,
    database: 'postgres',
    user: 'postgres',
    password: 'postgres',
  });

  try {
    await client.connect();
    
    // Check machines table
    const machinesRes = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'machines'
      ORDER BY ordinal_position
    `);
    
    console.log('MACHINES TABLE COLUMNS:');
    machinesRes.rows.forEach(row => {
      console.log(`  ${row.column_name}: ${row.data_type}`);
    });
    
    // Check how many machines exist
    const countRes = await client.query('SELECT COUNT(*) as count FROM public.machines');
    console.log(`\nTotal machines: ${countRes.rows[0].count}`);
    
    // Check a sample machine
    const sampleRes = await client.query('SELECT * FROM public.machines LIMIT 1');
    if (sampleRes.rows.length > 0) {
      console.log('\nSample machine:');
      console.log(sampleRes.rows[0]);
    }
    
    await client.end();
  } catch (e) {
    console.error('ERROR:', e.message);
  }
}

inspectSchema();
