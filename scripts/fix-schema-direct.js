const { Client } = require('pg');

async function run() {
  const client = new Client({
    connectionString: "postgresql://postgres:postgres@127.0.0.1:54322/postgres"
  });

  try {
    await client.connect();
    console.log("Connected to DB");

    // Add column if missing
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ingestion_phase') THEN
          CREATE TYPE public.ingestion_phase AS ENUM ('INIT', 'INVENTORY', 'CLASSIFY', 'EXTRACT', 'CONSOLIDATE', 'GRAPH_BUILD', 'QA_AUDIT', 'GAP_REPAIR', 'FINALIZE');
        END IF;
      END $$;
    `);

    await client.query(`
      ALTER TABLE public.machine_ingestion_steps 
      ADD COLUMN IF NOT EXISTS phase public.ingestion_phase NOT NULL DEFAULT 'INIT';
    `);

    console.log("Schema fixed successfully (phase column added if missing)");
  } catch (err) {
    console.error("Failed to fix schema:", err);
  } finally {
    await client.end();
  }
}

run();
