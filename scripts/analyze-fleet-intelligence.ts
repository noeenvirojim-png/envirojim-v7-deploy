/**
 * EnviroJim AI Fleet Intelligence & Prediction Engine
 * Analyzes organization-wide repair history to detect high-risk patterns.
 */
import { createAdminClient } from '../src/lib/supabase/admin';

async function analyzeFleetIntelligence() {
    const supabase = createAdminClient();
    console.log('--- ENVIROJIM FLEET INTELLIGENCE RUN ---');

    // 1. Analyze Repair Knowledge Base for Recurring Patterns
    // Aggregating manual patterns in the app logic for now
    const { data: kbEntries } = await supabase.from('repair_knowledge_base').select('*');
    if (!kbEntries) return;

    const patterns: Record<string, any> = {};

    for (const entry of kbEntries) {
        const key = `${entry.component}|${entry.failure_mode}`;
        if (!patterns[key]) {
            patterns[key] = {
                component: entry.component,
                failure_mode: entry.failure_mode,
                count: 0,
                machines: new Set()
            };
        }
        patterns[key].count += entry.occurrence_count;
        if (entry.machine_id) patterns[key].machines.add(entry.machine_id);
    }

    // 2. Update Fleet Failure Patterns table
    for (const [key, p] of Object.entries(patterns)) {
        const riskScore = Math.min((p.count / 10), 0.95); // Example linear risk scaling
        
        await supabase.from('fleet_failure_patterns').upsert({
            component: p.component,
            failure_mode: p.failure_mode,
            occurrence_count: p.count,
            risk_score: riskScore
        }, { onConflict: 'component, failure_mode' });
    }

    // 3. Predictive Failure Detection for specific machines
    // Logic: If a machine has high operating hours and belongs to a fleet with a high risk component...
    const { data: machines } = await supabase.from('machines').select('*');
    if (!machines) return;

    const predictions = [];
    for (const machine of machines) {
        // Simple heuristic: if machine model matches high risk patterns
        // We look for patterns where this machine or similar ones failed
        const highRiskPatterns = Object.values(patterns).filter(p => p.count > 5);
        
        for (const hrp of highRiskPatterns) {
            predictions.push({
                machine_id: machine.id,
                risk_component: hrp.component,
                probability: Math.round(hrp.count * 10), // Example
                recommended_action: `Inspection préventive : ${hrp.component}`,
                suggested_parts: []
            });
        }
    }

    console.log(`[Fleet AI] Processed ${kbEntries.length} KB entries. Generated ${predictions.length} alerts.`);
    console.log('✅ Done.');
}

analyzeFleetIntelligence().catch(console.error);
