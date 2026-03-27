require('dotenv').config({ path: '.env.local' });

const requiredKeys = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'POSTGRES_URL' // or DATABASE_URL
];

console.log('Verifying environment variables...');

let missing = false;

requiredKeys.forEach(key => {
    if (!process.env[key]) {
        console.error(`❌ Missing: ${key}`);
        missing = true;
    } else {
        // Check for placeholder values
        if (process.env[key].includes('your-project') || process.env[key].includes('placeholder')) {
            console.warn(`⚠️ Warning: ${key} looks like a placeholder`);
        } else {
            console.log(`✅ Present: ${key}`);
        }
    }
});

if (missing) {
    console.error('Environment verification failed.');
    process.exit(1);
} else {
    console.log('Environment verification passed.');
}
