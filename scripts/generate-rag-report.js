const fs = require('fs');
const path = require('path');

const REPORT_DIR = path.join(__dirname, '../tests/audit-results');
const HEARTBEAT_REPORT = path.join(__dirname, '../stability_report.json');
const OUTPUT_HTML = path.join(__dirname, '../PHASE_2_UI_STABILITY_REPORT.md');

function generateReport() {
    console.log('Generating RAG Status Report...');

    let heartbeatData = {};
    if (fs.existsSync(HEARTBEAT_REPORT)) {
        heartbeatData = JSON.parse(fs.readFileSync(HEARTBEAT_REPORT, 'utf8'));
    }

    const screenshots = fs.existsSync(REPORT_DIR) ? fs.readdirSync(REPORT_DIR).filter(f => f.endsWith('.png')) : [];

    let report = `# 📊 EnviroJim V7.2 - Continuous RAG Status Report\n\n`;
    report += `**Generated**: ${new Date().toISOString()}\n\n`;

    // 1. Heartbeat Section
    report += `## 💓 Phase 1: Heartbeat Monitoring\n`;
    const authStatus = heartbeatData.auth === 'SUCCESS' ? '🟢 PASS' : '🔴 FAIL';
    report += `- **Auth Status**: ${authStatus}\n`;
    
    report += `### Route Status Codes\n`;
    for (const [route, code] of Object.entries(heartbeatData.routes || {})) {
        const icon = code === 200 ? '🟢' : '🔴';
        report += `- ${icon} \`${route}\`: ${code}\n`;
    }

    if (heartbeatData.errors && heartbeatData.errors.length > 0) {
        report += `\n### ⚠️ Critical Anomalies\n`;
        heartbeatData.errors.forEach(err => {
            report += `- \`${err}\`\n`;
        });
    }

    // 2. UI Stability Section
    report += `\n## 📱 Phase 2: UI Stability (Multi-Device)\n`;
    if (screenshots.length > 0) {
        report += `### Visual Verification\n\n`;
        report += `| Device | Screenshot |\n`;
        report += `| --- | --- |\n`;
        screenshots.forEach(s => {
            const device = s.replace('ui-', '').replace('.png', '').toUpperCase();
            report += `| ${device} | ![${device}](file:///c:/Users/Noé EVE/OneDrive - Envirojim/Bureau/ENVIROJIM_HANDOVER_PACKAGE/tests/audit-results/${s}) |\n`;
        });
    } else {
        report += `*No UI audit screenshots found. Run the Playwright suite first.*\n`;
    }

    report += `\n---\n**Verdict**: ${heartbeatData.auth === 'SUCCESS' ? 'STABLE 🟢' : 'UNSTABLE 🔴'}\n`;

    fs.writeFileSync(OUTPUT_HTML, report);
    console.log(`Report generated: ${OUTPUT_HTML}`);
}

if (require.main === module) {
    generateReport();
}
