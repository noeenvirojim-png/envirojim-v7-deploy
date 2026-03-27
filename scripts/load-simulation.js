const http = require('http');
const path = require('path');
require('dotenv').config({ path: path.join(process.cwd(), '.env.local') });

async function runLoadTest() {
    console.log("🚀 [LOAD SIMULATION] Starting performance stress test...");

    const target = process.env.BASE_URL || "http://localhost:3000";
    const iterations = 50;
    const latencies = [];

    for (let i = 0; i < iterations; i++) {
        const start = Date.now();
        try {
            await new Promise((resolve, reject) => {
                http.get(target, (res) => {
                    res.on('data', () => { });
                    res.on('end', resolve);
                }).on('error', reject);
            });
            latencies.push(Date.now() - start);
        } catch (e) {
            console.error(`Iteration ${i} failed: ${e.message}`);
        }
    }

    latencies.sort((a, b) => a - b);
    const p95Index = Math.floor(latencies.length * 0.95);
    const p95 = latencies[p95Index];

    console.log(`📊 Results: Min: ${latencies[0]}ms, Max: ${latencies[latencies.length - 1]}ms, P95: ${p95}ms`);

    if (p95 > 5000) {
        console.error("❌ LATENCY_FAIL: P95 exceeds 5000ms threshold.");
        process.exit(1);
    } else {
        console.log("✅ PASS: Performance within limits.");
        process.exit(0);
    }
}

runLoadTest().catch(err => {
    console.error("❌ Load Simulation Fatal Error:", err);
    process.exit(1);
});
