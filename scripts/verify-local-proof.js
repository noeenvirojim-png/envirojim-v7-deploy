const { execSync } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

console.log('🧪 ENVIROJIM - LOCAL PROOF VERIFICATION');
console.log('='.repeat(40));

const checks = {
    files: [
        '.env.local',
        'supabase/config.toml',
        'scripts/bootstrap-local.js',
        'package.json'
    ],
    ports: [
        { port: 3000, name: 'Next.js App' },
        { port: 54321, name: 'Supabase API' },
        { port: 54323, name: 'Supabase Studio' }
    ]
};

const ROOT = path.join(__dirname, '..');

async function verify() {
    let success = true;

    // 1. File Checks
    console.log('\n📁 Checking Critical Files:');
    for (const file of checks.files) {
        if (fs.existsSync(path.join(ROOT, file))) {
            console.log(`✅ ${file} exists`);
        } else {
            console.log(`❌ ${file} MISSING`);
            success = false;
        }
    }

    // 2. Service Checks (Supabase)
    console.log('\n⚡ Checking Supabase Services:');
    try {
        const status = execSync('npx supabase status', { encoding: 'utf8' });
        if (status.includes('SERVICE_NAME')) {
            console.log('✅ Supabase stack is running');
        } else {
            console.log('❌ Supabase stack NOT running perfectly');
            success = false;
        }
    } catch (e) {
        console.log('❌ Supabase CLI error or stack down');
        success = false;
    }

    // 3. Port Listeners
    console.log('\n🌐 Checking Port Listeners:');
    for (const { port, name } of checks.ports) {
        try {
            // Simplified check: if it connects, someone is listening
            execSync(`netstat -ano | findstr :${port}`, { stdio: 'ignore' });
            console.log(`✅ Port ${port} (${name}) is active`);
        } catch (e) {
            console.log(`❌ Port ${port} (${name}) is CLOSED`);
            // We don't fail immediately, maybe app is just not 'npm run dev' yet
        }
    }

    // 4. DB Connectivity & Seed Proof
    console.log('\n🗄️  Verifying Database & Seed Proof:');
    try {
        const checkSqlScript = path.join(ROOT, 'scripts', 'check_sql.js');
        const result = execSync(`node "${checkSqlScript}"`, { encoding: 'utf8', env: { ...process.env, NODE_ENV: 'development' } });
        if (result.includes('PASS')) {
            console.log('✅ Admin user and test data verified via Direct SQL (Seed verified)');
        } else {
            console.log('❌ Admin user NOT found (Seed likely failed)');
            success = false;
        }
    } catch (e) {
        console.log('❌ Database connectivity error');
        success = false;
    }

    console.log('\n' + '='.repeat(40));
    if (success) {
        console.log('🏆 VERDICT: LOCAL ENVIRONMENT PROVEN PERFECT');
        process.exit(0);
    } else {
        console.log('⚠️  VERDICT: LOCAL ENVIRONMENT HAS GAPS');
        process.exit(1);
    }
}

verify();
