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

const CHECKLIST_ITEMS = [
    { label: "Contrôle niveau d'huile moteur (Jauge)", required: true },
    { label: "Contrôle niveau d'huile hydraulique (Viseur)", required: true },
    { label: "Contrôle niveau liquide de refroidissement", required: true },
    { label: "Inspection visuelle des fuites (Moteur, Vérins)", required: true },
    { label: "Contrôle état des bandes transporteuses (Déchirures/Tension)", required: true },
    { label: "Vérification des Arrêts d'Urgence (Fonctionnement)", required: true },
    { label: "Nettoyage du radiateur / refroidisseur (Soufflette)", required: true },
    { label: "Vérification des feux et avertisseurs sonores", required: true }
];

async function run() {
    try {
        await client.connect();

        // 1. Get the Machine
        const machineRes = await client.query("SELECT id, organization_id FROM machines WHERE model = 'VB750 DK' LIMIT 1");
        if (machineRes.rows.length === 0) {
            console.error("Machine VB750 DK not found. Run full simulation first.");
            return;
        }
        const machine = machineRes.rows[0];
        console.log(`Found Machine: ${machine.id}`);

        // 2. Create/Update Template
        console.log("Creating Daily Checklist Template...");
        // Check if exists
        let templateId;
        const tmplRes = await client.query("SELECT id FROM checklist_templates WHERE machine_id = $1 AND name = 'Contrôle Quotidien (Matin)'", [machine.id]);

        const templateData = JSON.stringify(CHECKLIST_ITEMS);

        if (tmplRes.rows.length > 0) {
            templateId = tmplRes.rows[0].id;
        } else {
            const insRes = await client.query(`
                INSERT INTO checklist_templates (organization_id, machine_id, name, items)
                VALUES ($1, $2, 'Contrôle Quotidien (Matin)', $3)
                RETURNING id
            `, [machine.organization_id, machine.id, templateData]);
            templateId = insRes.rows[0].id;
        }
        console.log(`Template ID: ${templateId}`);

        // 3. Generate 7 Days of History
        console.log("Generating 7 Days of Checkup History...");

        // Get user from auth.users first
        const authUserRes = await client.query("SELECT id, email FROM auth.users LIMIT 1");
        let techId = authUserRes.rows[0]?.id;
        const techEmail = authUserRes.rows[0]?.email;

        // Ensure user exists in public.users (foreign key target)
        const publicUserRes = await client.query("SELECT id FROM public.users WHERE id = $1", [techId]);

        if (publicUserRes.rows.length === 0 && techId) {
            console.log(`Syncing user ${techId} to public.users...`);
            await client.query(`
                INSERT INTO public.users (id, email, full_name, role, org_id)
                VALUES ($1, $2, 'Simulated Technician', 'TECHNICIAN', $3)
             `, [techId, techEmail, machine.organization_id]);
        } else if (!techId) {
            console.log("No auth user found. Cannot assign technician.");
            return;
        }

        for (let i = 0; i < 7; i++) {
            const date = new Date();
            date.setDate(date.getDate() - i);

            // Randomly COMPLIANT or NOT (mostly compliant)
            const isCompliant = Math.random() > 0.2;
            const status = isCompliant ? 'COMPLETED' : 'FLAGGED';

            await client.query(`
                INSERT INTO checklists (
                    organization_id, machine_id, template_id, technician_user_id,
                    status, is_compliant, created_at, updated_at, engine_hours_input
                ) VALUES (
                    $1, $2, $3, $4,
                    $5, $6, $7, $7, 1250
                )
            `, [
                machine.organization_id, machine.id, templateId, techId,
                status, isCompliant, date
            ]);
        }
        console.log("History generated.");

    } catch (e) {
        console.error("Error:", e);
    } finally {
        await client.end();
    }
}

run();
