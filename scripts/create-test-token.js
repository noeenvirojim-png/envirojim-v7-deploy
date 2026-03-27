const pg = require('pg');

async function createTestToken() {
    const connectionString = 'postgresql://postgres.ptznkpeneqfqhackdeau:%40Enviro2018!@aws-0-us-west-2.pooler.supabase.com:6543/postgres';
    const client = new pg.Client({ 
        connectionString, 
        ssl: { rejectUnauthorized: false } 
    });

    try {
        // Fetch a valid organization ID
        const orgRes = await client.query('SELECT id FROM public.organizations LIMIT 1');
        if (orgRes.rows.length === 0) {
            throw new Error('No organizations found in database');
        }
        const orgId = orgRes.rows[0].id;

        // Use a unique name for the test client
        const clientName = 'CERTIFICATION_TEST_' + Date.now();
        const clientEmail = `cert-test-${Date.now()}@envirojim.com`;
        
        const clientRes = await client.query(
            'INSERT INTO public.clients (name, email, owner_org_id, status) VALUES ($1, $2, $3, $4) RETURNING id',
            [clientName, clientEmail, orgId, 'ACTIVE']
        );
        
        const clientId = clientRes.rows[0].id;
        const token = 'CERT_TOKEN_V8_PROD_' + Math.random().toString(36).substring(7);
        
        await client.query(
            'INSERT INTO public.client_oauth_tokens (client_id, token, expires_at) VALUES ($1, $2, NOW() + INTERVAL \'1 hour\')',
            [clientId, token]
        );
        
        const fs = require('fs');
        fs.writeFileSync('token.txt', token);
        console.log('SUCCESS:VALID_TOKEN=' + token);
    } catch (err) {
        console.error('ERROR:', err.message);
        process.exit(1);
    } finally {
        await client.end();
    }
}

createTestToken();
