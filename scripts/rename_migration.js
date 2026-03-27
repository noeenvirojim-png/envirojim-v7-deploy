const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '..', 'supabase', 'migrations', '20260315000000_performance_optimization.sql');
const dest = path.join(__dirname, '..', 'supabase', 'migrations', '20260315000005_performance_optimization.sql');

try {
    if (fs.existsSync(src)) {
        fs.renameSync(src, dest);
        console.log(`✅ Renamed ${src} to ${dest}`);
    } else {
        console.log(`⚠️ Source not found: ${src}`);
    }
} catch (err) {
    console.error(`❌ Error renaming: ${err.message}`);
}
