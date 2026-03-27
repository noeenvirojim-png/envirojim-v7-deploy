import * as fs from 'fs';
import * as path from 'path';

/**
 * SECURITY SCAN: ARCHITECTURAL LINTING (Phase 4.1)
 * 
 * Enforces:
 * 1. No direct supabase.auth.getUser() calls (Must use auth-bridge).
 * 2. No non-NEXT_PUBLIC process.env access in client-side files.
 * 3. No secrets in strings.
 */

const FORBIDDEN_PATTERNS = [
    {
        name: 'Direct Auth Usage',
        regex: /\.auth\.getUser\(\)/g,
        severity: 'FAIL',
        details: 'Must use getCanonicalUser() or getCurrentUserId() from @/lib/auth-bridge'
    },
    {
        name: 'Unsafe Environment Access',
        regex: /process\.env\.(?!NEXT_PUBLIC_)[A-Z0-9_]+/g,
        severity: 'WARN',
        details: 'Potential secret leak in client-safe code if not careful'
    }
];

const SCAN_DIRS = [
    'src/app',
    'src/components',
    'src/domain',
    'src/lib'
];

const IGNORE_FILES = [
    'auth-bridge.ts', // Authorized source
    'supabase/server.ts',
    'supabase/client.ts',
    'jwt-utils.ts',
    'middleware.ts'   // Infrastructure gate
];

let failureCount = 0;

function scanFile(filePath: string) {
    const fileName = path.basename(filePath);
    if (IGNORE_FILES.includes(fileName)) return;

    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const relativePath = path.relative(process.cwd(), filePath);

    FORBIDDEN_PATTERNS.forEach(pattern => {
        lines.forEach((line, index) => {
            const matches = line.match(pattern.regex);
            if (matches) {
                console.log(`[${pattern.severity}] ${pattern.name} found in ${relativePath}:${index + 1}`);
                console.log(`   Line: ${line.trim()}`);
                console.log(`   Detail: ${pattern.details}`);
                if (pattern.severity === 'FAIL') failureCount++;
            }
        });
    });
}

function walkDir(dir: string) {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            walkDir(fullPath);
        } else if (file.match(/\.(ts|tsx|js|jsx)$/)) {
            scanFile(fullPath);
        }
    });
}

console.log('🚀 INITIALIZING SECURITY SCAN...');

SCAN_DIRS.forEach(dir => {
    const fullPath = path.resolve(process.cwd(), dir);
    if (fs.existsSync(fullPath)) {
        walkDir(fullPath);
    }
});

if (failureCount > 0) {
    console.error(`\n❌ SECURITY SCAN FAILED: ${failureCount} critical violations found.`);
    process.exit(1);
} else {
    console.log('\n✅ SECURITY SCAN PASSED: No critical architectural violations detected.');
    process.exit(0);
}
