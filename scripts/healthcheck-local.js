const http = require('http');
const { execSync } = require('child_process');

console.log('🩺 ENVIROJIM - LOCAL HEALTHCHECK');
console.log('='.repeat(40));

async function checkUrl(url, name) {
    return new Promise((resolve) => {
        const req = http.get(url, (res) => {
            if (res.statusCode >= 200 && res.statusCode < 400) {
                console.log(`✅ ${name} accessible (${url})`);
                resolve(true);
            } else {
                console.log(`❌ ${name} returned status ${res.statusCode} (${url})`);
                resolve(false);
            }
        });
        req.on('error', (err) => {
            console.log(`❌ ${name} NOT accessible (${url}) - ${err.message}`);
            resolve(false);
        });
        req.end();
    });
}

async function runHealthcheck() {
    let perfect = true;

    // 1. Supabase Services
    console.log('\n⚡ Checking Supabase Services:');
    try {
        const status = execSync('npx supabase status', { encoding: 'utf8' });
        if (status.includes('SERVICE_NAME')) {
            console.log('✅ Supabase stack is HEALHY');
        } else {
            console.log('❌ Supabase stack has issues');
            perfect = false;
        }
    } catch (e) {
        console.log('❌ Supabase CLI error or stack is down');
        perfect = false;
    }

    // 2. App Accessibility (if running)
    console.log('\n🌐 Checking Next.js App:');
    const appUp = await checkUrl('http://localhost:3000', 'Frontend');
    if (!appUp) {
        console.log('💡 Tip: Run "npm run dev" to start the app.');
    }

    // 3. Auth API Check
    console.log('\n🔐 Checking Auth Connectivity:');
    const authUp = await checkUrl('http://localhost:54321/auth/v1/health', 'Auth API');
    if (!authUp) perfect = false;

    // 4. Storage API Check
    console.log('\n📦 Checking Storage Connectivity:');
    const storageUp = await checkUrl('http://localhost:54321/storage/v1/health', 'Storage API');
    if (!storageUp) perfect = false;

    console.log('\n' + '='.repeat(40));
    if (perfect) {
        console.log('🟢 STATUS: GO - Environment is ready for work.');
        process.exit(0);
    } else {
        console.log('🔴 STATUS: NO-GO - Some critical services are down.');
        process.exit(1);
    }
}

runHealthcheck();
