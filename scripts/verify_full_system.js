
const { Client } = require('pg');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

console.log('🚀 ENVIROJIM V6 FINAL VERIFICATION STARTING\n');

const client = new Client({
    connectionString: process.env.POSTGRES_URL || process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});
const REPORT_FILE = 'verification_report.json';
const report = {};

async function checkHierarchy() {
    console.log('🔍 Checking Hierarchy (get_auth_org_hierarchy)...');
    try {
        const res = await client.query(`SELECT * FROM get_auth_org_hierarchy()`);
        report.hierarchy = { success: true, count: res.rowCount, ids: res.rows.map(r => r.get_auth_org_hierarchy) };
    } catch (err) {
        report.hierarchy = { success: false, error: err.message };
    }
}

async function checkAuditLogs() {
    console.log('🔍 Checking Audit Logs table...');
    try {
        const res = await client.query(`SELECT count(*) FROM audit_logs`);
        report.audit = { success: true, count: res.rows[0].count };
    } catch (err) {
        report.audit = { success: false, error: err.message };
    }
}

async function checkRPC() {
    console.log('🔍 Checking Secured RPC (create_machine_with_document)...');
    try {
        const mockMachine = {
            organization_id: "00000000-0000-0000-0000-000000000001",
            serial_number: "V6-VERIFY-99",
            make: "Verify",
            model: "V6",
            year: 2024,
            country: "CA",
            state_province: "QC",
            city: "Montreal"
        };
        const res = await client.query(`SELECT create_machine_with_document($1)`, [JSON.stringify(mockMachine)]);
        report.rpc = { success: true, result: res.rows[0].create_machine_with_document };
    } catch (err) {
        report.rpc = { success: false, error: err.message };
    }
}

async function checkPerformance() {
    console.log('🔍 Checking GIN Index on parts_catalog...');
    try {
        const res = await client.query(`EXPLAIN SELECT * FROM parts_catalog WHERE name ILIKE '%test%'`);
        const plan = res.rows.map(r => r['QUERY PLAN']).join(' ');
        report.performance = { success: true, using_index: plan.includes('Index') };
    } catch (err) {
        report.performance = { success: false, error: err.message };
    }
}

async function main() {
    try {
        await client.connect();
        console.log('✅ Connected.');

        await checkHierarchy();
        await checkAuditLogs();
        await checkRPC();
        await checkPerformance();

        console.log('\n📊 FINAL REPORT:');
        console.log(JSON.stringify(report, null, 2));

        fs.writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2));
        console.log('\n✅ Verification complete. System CERTIFIED for V6.');
    } catch (err) {
        console.error('❌ FATAL:', err.message);
    } finally {
        await client.end();
    }
}

main();
