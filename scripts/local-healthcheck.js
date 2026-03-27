const { execSync } = require('child_process');

function run(label, command) {
  try {
    console.log(`\n--- ${label} ---`);
    execSync(command, { stdio: 'inherit' });
    console.log(`✅ ${label}: PASS`);
  } catch (error) {
    console.error(`❌ ${label}: FAIL`);
    process.exit(1);
  }
}

run('Verify Auth Seed', 'node scripts/verify-auth-seed.js');
run('Init Storage', 'node scripts/init-storage.js');

console.log('\n✅ LOCAL HEALTHCHECK COMPLETE');
