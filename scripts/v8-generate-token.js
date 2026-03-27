const pg = require('pg');
const fs = require('fs');
const path = require('path');

async function createTestToken() {
    // Database connection
    const connectionString = 'postgresql://postgres.ptznkpeneqfqhackdeau:%40Enviro2018!@aws-0-us-west-2.pooler.supabase.com:6543/postgres';
    const client = new pg.Client({ 
        connectionString, 
        ssl: { rejectUnauthorized: false } 
    });

    // Use a fixed absolute path for the token file to avoid relative path issues on Windows
    const tokenFilePath = path.join(__dirname, 'v8_token.txt');

    try {
        await client.connect();
        
        // Fetch a valid organization ID
        const orgRes = await client.query('SELECT id FROM public.organizations LIMIT 1');
        if (orgRes.rows.length === 0) {
            throw new Error('No organizations found in database');
        }
        const orgId = orgRes.rows[0].id;

        // Use a unique name for the test client
        const clientName = 'V8_CERT_TEST_' + Date.now();
        const clientEmail = `v8-cert-${Date.now()}@envirojim.com`;
        
        const clientRes = await client.query(
            'INSERT INTO public.clients (name, email, owner_org_id, status) VALUES ($1, $2, $3, $4) RETURNING id',
            [clientName, clientEmail, orgId, 'ACTIVE']
        );
        
        const clientId = clientRes.rows[0].id;
        const token = 'V8_PROD_TOKEN_' + Math.random().toString(36).substring(7).toUpperCase();
        
        await client.query(
            'INSERT INTO public.client_oauth_tokens (client_id, token, expires_at) VALUES ($1, $2, NOW() + INTERVAL \'1 hour\')',
            [clientId, token]
        );
        
        // Write to file
        fs.writeFileSync(tokenFilePath, token, 'utf8');
        
        console.log('--- V8 TOKEN GENERATED ---');
        console.log('TOKEN:', token);
        console.log('WRITTEN TO:', tokenFilePath);
        console.log('--------------------------');
    } catch (err) {
        console.error('CRITICAL ERROR:', err.message);
        process.exit(1);
    } finally {
        await client.end();
    }
}

createTestToken();
