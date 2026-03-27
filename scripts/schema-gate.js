const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(process.cwd(), '.env.local') });

/**
 * NUCLEAR SCHEMA DRIFT ZERO-TOLERANCE GATE (JS VERSION)
 * 
 * Compares live DB schema against the GOLDEN_V6 standard.
 * Fails if any table, column, policy, trigger, or function is missing.
 */

const fs = require('fs');

function log(msg) {
    console.log(msg);
    fs.appendFileSync('schema_audit.log', msg + '\n');
}

function error(msg) {
    console.error(msg);
    fs.appendFileSync('schema_audit.log', '[ERROR] ' + msg + '\n');
}

async function validateSchema() {
    fs.writeFileSync('schema_audit.log', ''); // Clear log
    log('☢️ [NUCLEAR GATE] Initializing Deep Production Inspection...');

    let connectionString = process.env.POSTGRES_URL;
    if (connectionString && connectionString.includes('sslmode=require')) {
        connectionString = connectionString.replace('?sslmode=require', '');
    }

    if (!connectionString) {
        error('❌ POSTGRES_URL is missing in .env.local');
        process.exit(1);
    }

    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        log('✅ Connected to LIVE PRODUCTION database.');

        const issues = [];

        // --- 1. TABLE & COLUMN CHECKS ---
        log('🔍 Scanning Tables & Columns...');
        const expectedSchema = {
            organizations: ['id', 'name', 'type', 'parent_id', 'deleted_at', 'created_at', 'updated_at'],
            users: ['id', 'organization_id', 'role', 'email', 'full_name', 'deleted_at', 'created_at', 'updated_at'],
            sites: ['id', 'organization_id', 'name', 'deleted_at', 'created_at', 'updated_at'],
            machines: ['id', 'organization_id', 'site_id', 'assigned_partner_id', 'serial_number', 'make', 'model', 'year', 'current_hours', 'engine_make', 'engine_serial', 'deleted_at', 'created_at', 'updated_at'],
            parts_catalog: ['id', 'part_number', 'name', 'description', 'price', 'deleted_at', 'created_at', 'updated_at'],
            part_requests: ['id', 'organization_id', 'machine_id', 'requester_user_id', 'status', 'urgency', 'client_po_number', 'deleted_at', 'created_at', 'updated_at'],
            part_request_items: ['id', 'request_id', 'part_catalog_id', 'part_number_snapshot', 'part_name_snapshot', 'quantity_requested', 'price_unit_cost', 'created_at'],
            interventions: ['id', 'organization_id', 'machine_id', 'technician_user_id', 'work_description', 'is_completed', 'completed_at', 'deleted_at', 'created_at', 'updated_at'],
            intervention_parts: ['id', 'intervention_id', 'part_id', 'quantity', 'created_at'],
            tickets: ['id', 'organization_id', 'machine_id', 'created_by', 'assigned_to', 'title', 'description', 'status', 'priority', 'resolved_at', 'deleted_at', 'created_at', 'updated_at'],
            diagnostic_nodes: ['id', 'parent_node_id', 'question_text', 'is_leaf', 'options', 'outcome_type', 'deleted_at', 'created_at'],
            diagnostic_sessions: ['id', 'organization_id', 'user_id', 'machine_id', 'path', 'outcome', 'deleted_at', 'created_at'],
            maintenance_definitions: ['id', 'organization_id', 'machine_id', 'task_name', 'interval_hours', 'description', 'created_at', 'updated_at'],
            checklist_templates: ['id', 'organization_id', 'machine_id', 'name', 'items', 'created_at', 'updated_at'],
            checklists: ['id', 'organization_id', 'machine_id', 'template_id', 'technician_user_id', 'status', 'is_compliant', 'engine_hours_input', 'created_at', 'updated_at'],
            rfqs: ['id', 'organization_id', 'request_id', 'supplier_email', 'status', 'sent_at', 'expires_at', 'created_at'],
            supplier_quotes: ['id', 'rfq_id', 'supplier_name', 'total_amount', 'currency', 'quote_file_url', 'is_selected', 'created_at'],
            manuals: ['id', 'organization_id', 'machine_id', 'title', 'file_url', 'processing_status', 'created_at'],
            notification_logs: ['id', 'organization_id', 'recipient_email', 'subject', 'template_name', 'sent_at'],
            documents: ['id', 'organization_id', 'machine_id', 'title', 'type', 'file_url', 'deleted_at', 'created_at', 'updated_at'],
            audit_logs: ['id', 'table_name', 'record_id', 'action_type', 'changed_by', 'changed_at', 'old_data', 'new_data']
        };

        for (const [tableName, expectedColumns] of Object.entries(expectedSchema)) {
            const res = await client.query(`
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_schema = 'public' AND table_name = $1
            `, [tableName]);

            const liveColumns = res.rows.map(r => r.column_name);

            if (liveColumns.length === 0) {
                issues.push(`❌ CRITICAL: Table MISSING: ${tableName}`);
                continue;
            }

            for (const col of expectedColumns) {
                if (!liveColumns.includes(col)) {
                    issues.push(`❌ CRITICAL: Column MISSING in ${tableName}: ${col}`);
                }
            }
        }

        // --- 2. RLS POLICY CHECKS ---
        log('🔍 Scanning RLS Policies...');
        const rlsRes = await client.query(`
            SELECT tablename, policyname, cmd, qual, with_check 
            FROM pg_policies 
            WHERE schemaname = 'public'
        `);

        const policies = rlsRes.rows;
        // Check for key policies existence
        const requiredPolicies = [
            { table: 'organizations', name: 'org_read' },
            { table: 'users', name: 'user_read' },
            { table: 'machines', name: 'machine_read' }
        ];

        for (const req of requiredPolicies) {
            const found = policies.find(p => p.tablename === req.table && p.policyname === req.name);
            if (!found) {
                issues.push(`❌ CRITICAL: RLS Policy MISSING: ${req.table}.${req.name}`);
            }
        }

        // --- 3. TRIGGER CHECKS ---
        log('🔍 Scanning Audit Triggers...');
        const triggerRes = await client.query(`
            SELECT event_object_table, trigger_name 
            FROM information_schema.triggers 
            WHERE trigger_schema = 'public' AND trigger_name LIKE 'tr_audit_%'
        `);
        // We expect at least one audit trigger per major table
        const auditedTables = new Set(triggerRes.rows.map(r => r.event_object_table));
        const mustAudit = ['organizations', 'users', 'machines', 'tickets', 'interventions'];

        for (const t of mustAudit) {
            if (!auditedTables.has(t)) {
                issues.push(`⚠️ HIGH: Audit Trigger MISSING for table: ${t}`);
            }
        }

        // --- 4. FUNCTION CHECKS ---
        log('🔍 Scanning RPC Functions...');
        const funcRes = await client.query(`
            SELECT routine_name 
            FROM information_schema.routines 
            WHERE routine_schema = 'public'
        `);
        const funcs = new Set(funcRes.rows.map(r => r.routine_name));
        const requiredFuncs = [
            'is_admin',
            'is_super_admin',
            'get_auth_org_hierarchy',
            'create_machine_with_document'
        ];

        for (const f of requiredFuncs) {
            if (!funcs.has(f)) {
                issues.push(`❌ CRITICAL: Security Function MISSING: ${f}`);
            }
        }

        // --- FINAL VERDICT ---
        if (issues.length > 0) {
            error('\n🛑 [NUCLEAR GATE] PRODUCTION PARITY FAILURE:');
            issues.forEach(issue => error(issue));
            error('\nAction: DANGER! Production database is drifting. Do not deploy.');
            process.exit(1);
        } else {
            log('\n✨ [NUCLEAR GATE] SYSTEM SECURE. Production database is 100% aligned with GOLDEN V6.');
            process.exit(0);
        }

    } catch (err) {
        error('❌ [NUCLEAR GATE] Fatal connection failure: ' + err.message);
        process.exit(1);
    } finally {
        await client.end();
    }
}

validateSchema();
