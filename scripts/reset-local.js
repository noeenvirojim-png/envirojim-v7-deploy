const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

function run(command, description) {
    console.log(`\n🧹 ${description}...`);
    try {
        execSync(command, { stdio: 'inherit', cwd: ROOT });
    } catch (e) {
        console.log(`⚠️  Warning: ${e.message}`);
    }
}

// 1. Stop and Purge
run('npx supabase stop', 'Stopping Supabase containers');

// 2. Clean temporary files
const tempFiles = ['.next', 'out', 'playwright-report', 'test-results'];
tempFiles.forEach(f => {
    const p = path.join(ROOT, f);
    if (fs.existsSync(p)) {
        console.log(`🧹 Deleting ${f}...`);
        try {
            fs.rmSync(p, { recursive: true, force: true });
            console.log(`✅ Deleted ${f}`);
        } catch (e) {
            console.log(`⚠️  Warning: Could not delete ${f}: ${e.message}`);
        }
    }
});

// 3. Restart Bootstrap
console.log('\n♻️  Restarting full bootstrap...');
run('node scripts/bootstrap-local.js', 'Re-initializing environment');

console.log('\n✨ RESET COMPLETE. Environment is factory fresh.');
