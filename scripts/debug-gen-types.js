const { execSync } = require('child_process');
require('dotenv').config({ path: '.env.local' });

const dbUrl = process.env.POSTGRES_URL;
console.log('Testing Supabase CLI with:', dbUrl ? 'URL present' : 'URL MISSING');

try {
    const out = execSync(`npx supabase gen types typescript --db-url "${dbUrl}"`, {
        env: { ...process.env, NODE_TLS_REJECT_UNAUTHORIZED: '0' },
        encoding: 'utf-8'
    });
    console.log('SUCCESS! Output length:', out.length);
} catch (err) {
    console.error('FAILED!');
    console.error('Status:', err.status);
    console.error('Stdout:', err.stdout?.toString());
    console.error('Stderr:', err.stderr?.toString());
}
