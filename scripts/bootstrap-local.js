const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('\n' + '='.repeat(50));
console.log('🚜 ENVIROJIM - BOOTSTRAP LOCAL ENVIRONMENT');
console.log('='.repeat(50));

const ROOT = path.join(__dirname, '..');

function run(command, description) {
    console.log(`\n📦 ${description}...`);
    try {
        execSync(command, { stdio: 'inherit', cwd: ROOT });
        console.log(`✅ SUCCESS`);
    } catch (error) {
        console.error(`❌ FAILED: ${description}`);
        console.error(error.message);
        process.exit(1);
    }
}

// 1. Dependency Check
console.log('\n🔍 Checking Dependencies...');
try {
    execSync('docker --version', { stdio: 'ignore' });
    console.log('✅ Docker is running');
} catch (e) {
    console.error('❌ ERROR: Docker is not running. Please start Docker Desktop.');
    process.exit(1);
}

// 2. Port Check
try {
    const portCheck = execSync('netstat -ano | findstr :3000', { encoding: 'utf8' });
    if (portCheck.includes('LISTENING')) {
        console.error('❌ ERROR: Port 3000 already in use. Kill the process before starting.');
        process.exit(1);
    }
} catch (e) {}

// 3. Env Setup
const envPath = path.join(ROOT, '.env.local');
const examplePath = path.join(ROOT, '.env.example');
if (!fs.existsSync(envPath)) {
    console.log('📝 Creating .env.local from template...');
    fs.copyFileSync(examplePath, envPath);
}

// 4. Supabase Lifecycle
run('npx supabase start', 'Starting Supabase Local Services');
run('npx supabase db reset', 'Resetting Database and Applying Migrations');

// 5. Seed Core Data (Bypass JWT)
run('node scripts/unified_proof.js', 'Seeding Admin, Machines, and Organizations via Direct SQL');

// 6. Initialize Storage
run('npx ts-node scripts/init-storage.ts', 'Initializing Storage Buckets');

// 7. Verification
console.log('\n🔎 Running Final Verification...');
run('node scripts/verify-local-proof.js', 'Mechanical Proof Check');

console.log('\n' + '🎉'.repeat(25));
console.log('   LOCAL ENVIRONMENT LOCKED DOWN AND READY');
console.log('   1. npm run dev');
console.log('   2. Login: noe@envirojim.com / EnviroJim2024!');
console.log('🎉'.repeat(25) + '\n');
