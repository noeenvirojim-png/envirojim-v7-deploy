const fs = require('fs');
const path = require('path');

const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations');
const filesToDelete = [
    '20260315000010_performance_optimization.sql',
    '20260315000011_fix_vector_dimensions.sql'
];

filesToDelete.forEach(file => {
    const fullPath = path.join(migrationsDir, file);
    try {
        if (fs.existsSync(fullPath)) {
            fs.unlinkSync(fullPath);
            console.log(`✅ Deleted ${fullPath}`);
        }
    } catch (err) {
        console.error(`❌ Error deleting ${file}: ${err.message}`);
    }
});
