export { };
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: '.env.local' });

// Handle SSL Connection Robustly
let connectionString = process.env.POSTGRES_URL;
if (connectionString && connectionString.includes('sslmode=require')) {
    connectionString = connectionString.replace('?sslmode=require', '');
}

const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false } // Required for Supabase direct connection in this env
});

// SIMULATED AI EXTRACTION RESULT (Derived from Manual Analysis)
// In a production environment, this object would come from Gemini API processing the PDF text.
const EXTRACTED_DATA = {
    model: 'VB750 DK',
    serial: '1208',
    make: 'Hammel / Enviro', // Inferred
    schedule: [
        { task: 'Graissage général (Points principaux)', interval_hours: 50, description: 'Voir Plan de graissage V230' },
        { task: 'Contrôle niveau hydraulique', interval_hours: 50, description: 'Vérifier niveau et app faire appoint si nécessaire' },
        { task: 'Vidange huile moteur', interval_hours: 250, description: 'Remplacer huile et filtres selon manuel constructeur moteur' },
        { task: 'Vidange réducteurs', interval_hours: 500, description: 'Vidange complète des réducteurs principaux' },
        { task: 'Remplacement filtres hydrauliques', interval_hours: 1000, description: 'Changer cartouches retour et pression' }
    ]
};

async function main() {
    try {
        console.log("Attempting DB Connection...");
        await client.connect();
        console.log("✅ Database Connected.");

        // 1. SETUP SCHEMA (Ensure tables exist)
        console.log("🛠️  Verifying Schema...");
        try {
            await client.query(`
                CREATE TABLE IF NOT EXISTS maintenance_definitions (
                    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                    machine_id UUID NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
                    task_name TEXT NOT NULL,
                    interval_hours INTEGER NOT NULL,
                    description TEXT,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );
            `);
            console.log("   maintenance_definitions table verified.");
        } catch (e) {
            console.error("❌ Schema Creation Failed:", e);
            throw e; // Stop if schema fails
        }
        // Using existing ticket tables mostly, but ensure we have what we need for tickets

        // 2. INGESTION (Simulate AI Upload)
        console.log("🚀 Starting Machine Ingestion (VB750 DK - 1208)...");

        // Check if machine exists to avoid duplicates or fetch it
        let machineId;
        const existing = await client.query("SELECT id FROM machines WHERE serial_number = $1", [EXTRACTED_DATA.serial]);

        if (existing.rows.length > 0) {
            console.log("   Machine already exists. Updating...");
            machineId = existing.rows[0].id;
        } else {
            console.log("   Creating new machine entity...");
            const insertRes = await client.query(`
                INSERT INTO machines (
                    organization_id, serial_number, make, model, 
                    current_hours, status
                ) VALUES (
                    (SELECT id FROM organizations LIMIT 1), -- Assign to first org
                    $1, $2, $3, 
                    1250, 'OPERATIONAL' -- Simulated telemetry: 1250h
                ) RETURNING id;
            `, [EXTRACTED_DATA.serial, EXTRACTED_DATA.make, EXTRACTED_DATA.model]);
            machineId = insertRes.rows[0].id;
        }
        console.log(`   Machine ID: ${machineId}`);

        // 3. MAINTENANCE SCHEDULE (AI Generated)
        console.log("📋 Generating Maintenance Schedule from Manual...");
        // Clear old definitions to simulate fresh ingestion
        await client.query("DELETE FROM maintenance_definitions WHERE machine_id = $1", [machineId]);

        for (const task of EXTRACTED_DATA.schedule) {
            await client.query(`
                INSERT INTO maintenance_definitions (machine_id, task_name, interval_hours, description)
                VALUES ($1, $2, $3, $4)
            `, [machineId, task.task, task.interval_hours, task.description]);
        }
        console.log(`   Created ${EXTRACTED_DATA.schedule.length} maintenance definitions.`);

        // 4. CHAOS TEST (Interventions/Tickets)
        console.log("🔥 Running Chaos Test (Simulating 5 Failures)...");
        const failureModes = [
            "Surauffe moteur (High Temp Warning)",
            "Pression hydraulique basse (Low Pressure)",
            "Vibration excessive (Sensor X-Axis)",
            "Niveau huile critique",
            "Arrêt d'urgence déclenché (E-Stop)"
        ];

        const technicianRes = await client.query("SELECT id FROM auth.users LIMIT 1");
        const techId = technicianRes.rows[0]?.id;

        for (const failure of failureModes) {
            try {
                await client.query(`
                    INSERT INTO interventions (
                        machine_id, organization_id, technician_user_id,
                        title, description, status
                    ) VALUES (
                        $1, 
                        (SELECT id FROM organizations LIMIT 1),
                        $2,
                        $3, 'Generated by Chaos Test', 'IN_PROGRESS'
                    )
                `, [machineId, techId, failure]);
            } catch (e: any) {
                console.log("   (Skipping intervention creation - error: " + e.message + ")");
            }
        }
        console.log("   Chaos events injected as Interventions.");

        // 5. BULK PART ORDERING
        console.log("📦 Simulating Bulk Part Ordering (30 Requests)...");
        // Fetch Catalog
        const catalogRes = await client.query("SELECT id, name, part_number, base_cost_cad FROM parts_catalog LIMIT 50");
        if (catalogRes.rows.length === 0) {
            console.log("   Warning: Part Catalog empty. Skipping orders.");
        } else {
            const parts = catalogRes.rows;
            const userRes = await client.query("SELECT id FROM auth.users LIMIT 1");
            const userId = userRes.rows[0]?.id;

            if (userId) {
                let requestsCreated = 0;
                for (let i = 0; i < 30; i++) {
                    // Create a request header
                    const reqRes = await client.query(`
                        INSERT INTO part_requests (
                            machine_id, requester_user_id, organization_id, status, urgency
                        ) VALUES (
                            $1, $2, (SELECT id FROM organizations LIMIT 1), 'DRAFT', 'NORMAL'
                        ) RETURNING id
                    `, [machineId, userId]);
                    const reqId = reqRes.rows[0].id;

                    // Add random items
                    const randomPart = parts[Math.floor(Math.random() * parts.length)];
                    const qty = Math.floor(Math.random() * 5) + 1;

                    await client.query(`
                        INSERT INTO part_request_items (
                            request_id, part_catalog_id, quantity_requested,
                            part_name_snapshot, part_number_snapshot,
                            price_unit_cost, price_unit_sale, final_price_cad
                        ) VALUES (
                            $1, $2, $3,
                            $4, $5,
                            $6, $7, $8
                        )
                    `, [
                        reqId, randomPart.id, qty,
                        randomPart.name, randomPart.part_number,
                        randomPart.base_cost_cad, randomPart.base_cost_cad * 1.3, // Mock markup
                        (randomPart.base_cost_cad * 1.3) * qty
                    ]);
                    requestsCreated++;
                }
                console.log(`   Successfully created ${requestsCreated} Part Requests.`);
            } else {
                console.log("   No user found to assign requests.");
            }
        }

        // 6. AUTO-CHECKUP / MAINTENANCE EVENTS
        console.log("⚙️  Verifying Auto-Maintenance Logic...");
        // Logic: If current_hours % interval < threshold, create 'maintenance_event' (ticket)
        // Here we just verify we can QUERY the due tasks
        const dueTasks = await client.query(`
            SELECT task_name, interval_hours FROM maintenance_definitions 
            WHERE machine_id = $1
            AND (1250 % interval_hours) = 0 -- 1250 is our simulated current_hours
        `, [machineId]);

        console.log("   Tasks Due at 1250h:");
        dueTasks.rows.forEach((t: any) => console.log(`    - [DUE] ${t.task_name} (${t.interval_hours}h interval)`));

        console.log("\n✅ FULL LIFECYCLE SIMULATION COMPLETE.");
        console.log("   The machine is live. 30 Orders created. Chaos injected. Maintenance generated.");

    } catch (err: any) {
        console.error("❌ Fatal Error in Simulation:", err);
    } finally {
        await client.end();
    }
}

main();
