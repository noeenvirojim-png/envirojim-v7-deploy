const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// 1. Set environment variables as requested by User
// Note: On Windows, "/tmp" typically resolves to the root of the current drive (e.g., C:\tmp)
process.env.HOME = "/tmp";
process.env.XDG_CACHE_HOME = "/tmp/cache";
process.env.XDG_CONFIG_HOME = "/tmp/config";

// 2. Ensure directories exist
const dirs = [process.env.HOME, process.env.XDG_CACHE_HOME, process.env.XDG_CONFIG_HOME];
console.log('🔧 Configuring custom environment:');
dirs.forEach(d => {
    try {
        if (!fs.existsSync(d)) {
            fs.mkdirSync(d, { recursive: true });
            console.log(`   Created: ${d}`);
        } else {
            console.log(`   Exists:  ${d}`);
        }
    } catch (e) {
        console.warn(`   ⚠️ Failed to create ${d}: ${e.message}`);
    }
});

// 3. Inherit current process env but override the specific ones
const env = { ...process.env };

try {
    // 4. Install Playwright Browsers (Firefox only to save time/space)
    console.log('\n📦 Installing Playwright (Firefox)...');
    execSync('npx playwright install firefox', { stdio: 'inherit', env });

    // 5. Run the Manual Login Check
    console.log('\n🎬 Running E2E Login Check...');
    // We override BASE_URL to use the new port 3001
    env.BASE_URL = 'http://localhost:3001';
    execSync('npx playwright test tests/e2e/manual-login-check.spec.ts', { stdio: 'inherit', env });

    console.log('\n✅ TEST SUCCESS! Screenshot should be in test-results/.');

} catch (error) {
    console.error('\n❌ Execution Failed:', error.message);
    // Continue even if fail, so we can verify output logs
}
