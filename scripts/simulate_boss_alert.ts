export { };
const { Client } = require('pg');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

let connectionString = process.env.POSTGRES_URL;
if (connectionString && connectionString.includes('sslmode=require')) {
    connectionString = connectionString.replace('?sslmode=require', '');
}

const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        await client.connect();

        console.log("🔔 Starting Boss Alert Simulation (Morning Shift)...");

        // 1. Find Machines with Completed Morning Checks Today
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const res = await client.query(`
            SELECT m.model, m.serial_number, c.is_compliant, ct.name as check_name, u.full_name as tech_name
            FROM checklists c
            JOIN machines m ON c.machine_id = m.id
            JOIN checklist_templates ct ON c.template_id = ct.id
            JOIN public.users u ON c.technician_user_id = u.id
            WHERE c.created_at >= $1
            AND ct.name ILIKE '%Matin%'
        `, [today]);

        if (res.rows.length === 0) {
            console.log("   No morning checks found yet today.");
        } else {
            console.log(`   Found ${res.rows.length} completed morning checks.`);

            // 2. Simulate Alert Generation
            for (const row of res.rows) {
                const statusIcon = row.is_compliant ? "✅" : "❌";
                const statusText = row.is_compliant ? "All Clear" : "ISSUES FOUND";

                console.log("\n   [SIMULATED EMAIL/SMS TO BOSS]");
                console.log(`   To: admin@envirojim.com`);
                console.log(`   Subject: ${statusIcon} Morning Check: ${row.model} (${row.serial_number})`);
                console.log(`   Body:`);
                console.log(`   Technician ${row.tech_name} submitted Morning Check.`);
                console.log(`   Status: ${statusText}`);
                if (!row.is_compliant) {
                    console.log(`   ACTION REQUIRED: Review detailed log in dashboard immediately.`);
                }
                console.log("   -------------------------------------------------");
            }
        }

    } catch (e) {
        console.error("Error:", e);
    } finally {
        await client.end();
    }
}

run();
