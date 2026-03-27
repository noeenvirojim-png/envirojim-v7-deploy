import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

/**
 * ARCHITECTURE LOCKDOWN SCRIPT (V6)
 * 
 * Enforces architectural constraints at build time.
 */

const CONTRACT_PATH = path.join(process.cwd(), 'ARCHITECTURE_CONTRACT_V6.json');
const contract = JSON.parse(fs.readFileSync(CONTRACT_PATH, 'utf-8'));

function fail(msg: string) {
    console.error(`❌ ARCHITECTURE VIOLATION: ${msg}`);
    process.exit(1);
}

// 1. Scan for Forbidden Calls
console.log('🔍 Scanning for forbidden auth calls...');
const forbidden = contract.auth.forbidden_calls;
const srcDir = path.join(process.cwd(), 'src');

function scanDir(dir: string) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            if (file !== 'node_modules' && file !== '.next' && file !== 'lib') {
                scanDir(fullPath);
            }
        } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
            const content = fs.readFileSync(fullPath, 'utf-8');
            for (const call of forbidden) {
                if (content.includes(call)) {
                    // Exception for canonical bridge
                    if (fullPath.includes(contract.auth.canonical_bridge.replace(/\//g, path.sep))) continue;

                    fail(`Forbidden call '${call}' found in ${fullPath}. Use the Auth Bridge instead.`);
                }
            }
        }
    }
}

scanDir(srcDir);
console.log('✅ Forbidden call scan passed.');

// 2. Validate Schema Integrity (Placeholder for complex diff)
console.log('🔍 Verifying schema contract...');
const schemaPath = path.join(process.cwd(), contract.schema.typescript_types);
if (!fs.existsSync(schemaPath)) {
    fail(`Schema file missing: ${schemaPath}`);
}
// Note: validate:schema handles the deep diff, this script ensures the gate is closed.

// 3. New Role/Org Type Detection
console.log('🔍 Checking for Role/Org drifts...');
const schemaContent = fs.readFileSync(schemaPath, 'utf-8');
for (const role of contract.roles) {
    if (!schemaContent.includes(role)) {
        console.warn(`⚠️ Warning: Role '${role}' not found in ${schemaPath}`);
    }
}

// 4. Verification Check: Machine Contract Test presence
const machineTestPath = path.join(process.cwd(), 'tests/e2e/machines-contract.spec.ts');
if (!fs.existsSync(machineTestPath)) {
    fail('Critical machine contract test is missing.');
}

console.log('🏁 ARCHITECTURE LOCKDOWN: PASS');
