const pg = require('pg');

async function checkUsers() {
    const connectionString = 'postgresql://postgres.ptznkpeneqfqhackdeau:%40Enviro2018!@aws-0-us-west-2.pooler.supabase.com:6543/postgres';
    const client = new pg.Client({ 
        connectionString, 
        ssl: { rejectUnauthorized: false } 
    });

    try {
        await client.connect();
        
        console.log('--- DB USER AUDIT ---');
        
        // Check auth.users
        const userRes = await client.query('SELECT id, email, last_sign_in_at, created_at FROM auth.users');
        console.log('Total Auth Users:', userRes.rows.length);
        console.log('Users:', JSON.stringify(userRes.rows, null, 2));

        // Also check if there is a 'noe@envirojim.com' specifically
        const noeRes = await client.query('SELECT id, email, encrypted_password FROM auth.users WHERE email = $1', ['noe@envirojim.com']);
        if (noeRes.rows.length > 0) {
            console.log('User noe@envirojim.com found.');
        } else {
            console.log('User noe@envirojim.com NOT FOUND in auth.users');
        }

    } catch (err) {
        console.error('ERROR during user audit:', err.message);
    } finally {
        await client.end();
    }
}

checkUsers();
