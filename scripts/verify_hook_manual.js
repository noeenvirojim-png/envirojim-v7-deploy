const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

async function verifyHook() {
    const connectionString = process.env.POSTGRES_URL;
    if (!connectionString) {
        console.error('Error: POSTGRES_URL is not defined');
        process.exit(1);
    }

    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('Connected to database.');

        // 1. Get a sample user (e.g., SUPER_ADMIN or anyone)
        const userRes = await client.query('SELECT id, email, role, organization_id FROM public.users LIMIT 2');
        if (userRes.rows.length === 0) {
            console.error('No users found in public.users to test with.');
            process.exit(1);
        }

        for (const user of userRes.rows) {
            console.log(`\n--- Testing for user: ${user.email} (Role: ${user.role}, Org: ${user.organization_id}) ---`);

            const event = {
                user_id: user.id,
                claims: {
                    orig_claim: "test"
                }
            };

            const hookResult = await client.query('SELECT public.custom_access_token_hook($1) as result', [event]);
            const finalClaims = hookResult.rows[0].result.claims;

            console.log('Hook results (claims):');
            console.log(JSON.stringify(finalClaims, null, 2));

            // Assertions
            const app_metadata = finalClaims.app_metadata || {};
            if (app_metadata.role === user.role) {
                console.log('✅ Role correctly injected.');
            } else {
                console.error(`❌ Role mismatch! Expected ${user.role}, got ${app_metadata.role}`);
            }

            const expectedOrg = user.organization_id || "NO_ORG";
            if (app_metadata.organization_id === expectedOrg) {
                console.log('✅ Organization ID correctly injected (or fallback applied).');
            } else {
                console.error(`❌ Organization ID mismatch! Expected ${expectedOrg}, got ${app_metadata.organization_id}`);
            }
        }

    } catch (err) {
        console.error('Verification failed:', err.message);
        process.exit(1);
    } finally {
        await client.end();
    }
}

verifyHook();
