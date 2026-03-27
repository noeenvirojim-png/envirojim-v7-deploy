const { Client } = require('pg');

async function run() {
  const client = new Client({
    connectionString: "postgresql://postgres:postgres@127.0.0.1:54322/postgres"
  });

  try {
    await client.connect();
    console.log("Connected to DB");

    const errs = await client.query('SELECT * FROM public.machine_ingestion_errors ORDER BY created_at DESC LIMIT 5;');
    console.log("LAST ERRORS:", JSON.stringify(errs.rows, null, 2));

    const steps = await client.query('SELECT * FROM public.machine_ingestion_steps ORDER BY started_at DESC LIMIT 5;');
    console.log("LAST STEPS:", JSON.stringify(steps.rows, null, 2));

    const extracts = await client.query('SELECT id, run_id, document_id, schema_valid FROM public.machine_document_extracts;');
    console.log("EXTRACTS:", JSON.stringify(extracts.rows, null, 2));

  } catch (err) {
    console.error("Query failed:", err);
  } finally {
    await client.end();
  }
}

run();
