const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * GENERATE AUDIT PROOF (Phase 5 Nuclear)
 */

async function generateProof() {
    console.log('📜 [AUDIT PROOF] Aggregating simulation evidence...');

    const proof = {
        audit_version: "V6.0.4-NUCLEAR-CERT",
        timestamp: new Date().toISOString(),
        environment: {
            type: "PROD_SIMULATION",
            ingress: process.env.BASE_URL || "localhost:3000",
            git_commit: getGitHash(),
        },
        results: {
            schema_audit: getJsonResult('schema_gate.log'), // Placeholder if we had log output
            e2e_tests: getPlaywrightResult('test-results.json'),
            load_test: getLoadTestResult('load_test.log')
        },
        status: "PENDING_VERDICT"
    };

    fs.writeFileSync('AUDIT_PROOF_FINAL.json', JSON.stringify(proof, null, 2));
    console.log('✅ [AUDIT PROOF] Generated AUDIT_PROOF_FINAL.json');
}

function getGitHash() {
    try {
        return execSync('git rev-parse HEAD').toString().trim();
    } catch {
        return "N/A";
    }
}

function getJsonResult(file) {
    if (fs.existsSync(file)) {
        return "LOG_CAPTURED";
    }
    return "MISSING";
}

function getPlaywrightResult(file) {
    if (fs.existsSync(file)) {
        try {
            const data = JSON.parse(fs.readFileSync(file, 'utf8'));
            return {
                passed: data.stats.expected,
                failed: data.stats.unexpected,
                duration: data.stats.duration
            };
        } catch {
            return "PARSE_ERROR";
        }
    }
    return "MISSING";
}

function getLoadTestResult(file) {
    if (fs.existsSync(file)) {
        return "CAPTURED";
    }
    return "N/A";
}

generateProof().catch(console.error);
