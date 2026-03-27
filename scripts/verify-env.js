// PHASE 0 - Environment Verification Script
// Verifies that Node.js reads real Supabase keys at runtime

const fs = require('fs');
const path = require('path');

console.log('═══════════════════════════════════════════════════════════');
console.log('PHASE 0 - ENVIRONMENT VERIFICATION');
console.log('Timestamp:', new Date().toISOString());
console.log('═══════════════════════════════════════════════════════════\n');

// Load .env.local manually
const envPath = path.join(__dirname, '..', '.env.local');
console.log('📂 Reading .env.local from:', envPath);

if (!fs.existsSync(envPath)) {
    console.error('❌ FAIL: .env.local file not found');
    process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
const envLines = envContent.split('\n');

const envVars = {};
envLines.forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
            envVars[key.trim()] = valueParts.join('=').trim();
        }
    }
});

console.log('\n📋 Environment Variables Found:');
console.log('NEXT_PUBLIC_SUPABASE_URL:', envVars.NEXT_PUBLIC_SUPABASE_URL ? '✓ SET' : '❌ MISSING');
console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✓ SET' : '❌ MISSING');

// Check for placeholder values
const url = envVars.NEXT_PUBLIC_SUPABASE_URL || '';
const key = envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

console.log('\n🔍 Validation:');

if (url.includes('your-project-url') || url.includes('placeholder')) {
    console.error('❌ FAIL: SUPABASE_URL contains placeholder value');
    console.error('   Value:', url);
    process.exit(1);
}

if (key.includes('your-anon-key') || key.includes('placeholder') || key.length < 100) {
    console.error('❌ FAIL: SUPABASE_ANON_KEY contains placeholder or invalid value');
    console.error('   Key length:', key.length, '(expected > 100)');
    process.exit(1);
}

// Validate URL format
if (!url.startsWith('https://') || !url.includes('.supabase.co')) {
    console.error('❌ FAIL: SUPABASE_URL has invalid format');
    console.error('   Expected: https://*.supabase.co');
    console.error('   Got:', url);
    process.exit(1);
}

console.log('✅ PASS: SUPABASE_URL is valid');
console.log('   URL:', url);
console.log('✅ PASS: SUPABASE_ANON_KEY is valid');
console.log('   Key length:', key.length, 'characters');

console.log('\n═══════════════════════════════════════════════════════════');
console.log('✅ PHASE 0 VERIFICATION: PASSED');
console.log('Node.js can read real Supabase credentials');
console.log('═══════════════════════════════════════════════════════════');

// Export for Phase 1
const result = {
    timestamp: new Date().toISOString(),
    phase: 'PHASE_0',
    status: 'PASSED',
    supabaseUrl: url,
    supabaseKeyLength: key.length,
    serverUrl: 'http://localhost:3001'
};

console.log('\n📄 JSON Result:');
console.log(JSON.stringify(result, null, 2));
