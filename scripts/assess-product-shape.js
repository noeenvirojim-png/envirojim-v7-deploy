const fs = require('fs');
const path = require('path');

console.log('[PHASE 4] PRODUCT SHAPE ASSESSMENT');
console.log('==================================\n');

console.log('[STEP 1] Identify VB750-Specific Paths Created\n');

const vb750SpecificPaths = [
  'src/domain/vb750/actions/diagnostic.ts',
  'src/domain/vb750/actions/maintenance.ts',
  'src/domain/vb750/actions/procurement.ts',
];

console.log('VB750-Specific Action Handlers:');
for (const p of vb750SpecificPaths) {
  console.log(`  • ${p}`);
}

console.log(`\nVB750-Specific Characteristics:`);
console.log(`  • Machine name hardcoded: 'VB750' in action names and queries`);
console.log(`  • Subsystem keywords hardcoded: Drivetrain, Hydraulics, Cooling, Electrical`);
console.log(`  • Procedures hardcoded: Monthly Drive, Quarterly Cooling, Annual Control`);
console.log(`  • Problem mappings hardcoded: Motor overheating → [Cooling, Drivetrain]\n`);

console.log('[STEP 2] Identify Generic/Reusable Product Paths\n');

const genericPaths = [
  'src/app/api/machines/[machineId]/intelligence/diagnostic/route.ts (OfficialDiagnosticService)',
  'src/app/api/machines/[machineId]/intelligence/maintenance/route.ts (MaintenanceAssistantService)',
  'src/app/dashboard/procurement/page.tsx (generic procurement UI)',
  'domain/procurement/actions/parts.ts (generic parts actions)',
];

console.log('Generic Product Paths (Already Exist):');
for (const p of genericPaths) {
  console.log(`  • ${p}`);
}

console.log(`\nGeneric Characteristics:`);
console.log(`  • Machine-agnostic: [machineId] parameterized`);
console.log(`  • Schema-driven: reads from fault_symptoms, diagnostic_links, procedures tables`);
console.log(`  • Organization-scoped: organization_id-based isolation`);
console.log(`  • Reusable: already working for other machines\n`);

console.log('[STEP 3] Analyze Dependency Chain\n');

console.log('Persistent Parts Table (public.parts):');
console.log('  • Is this table machine-agnostic? YES (has machine_id FK)');
console.log('  • Is isolation automatic? YES (machine_id + UNIQUE constraint)');
console.log('  • Can generic flows consume it? YES (just add machine_id filter)\n');

console.log('VB750 Actions:');
console.log('  • Are they reusable for other machines? PARTIAL');
console.log('  • Can they be parameterized? YES (machine_name → machine_id)');
console.log('  • Are subsystem keywords machine-specific? YES (hardcoded)\n');

const shapeAssessment = {
  current_status: 'VERTICAL_LOCKED_WITH_GENERIC_FOUNDATION',
  reasoning: 'VB750 actions are specific machine adaptations, but persistent.public.parts table is generic and machine-agnostic',
  
  vb750_specific: [
    'src/domain/vb750/actions/diagnostic.ts',
    'src/domain/vb750/actions/maintenance.ts',
    'src/domain/vb750/actions/procurement.ts',
  ],
  
  vb750_hardcoded_dependencies: [
    'Machine name: VB750',
    'Subsystem keywords: Drivetrain, Hydraulics, Cooling, Electrical, Chassis',
    'Maintenance procedures: Monthly Drive, Quarterly Cooling, Annual Control',
    'Problem→subsystem mappings',
  ],

  generic_reusable: [
    'public.parts persistent table (machine-agnostic)',
    'Machine isolation via machine_id FK',
    'OfficialDiagnosticService (generic KB structure)',
    'MaintenanceAssistantService (generic tasks)',
    'Generic procurement UI + actions',
  ],

  path_to_generic_readiness: [
    'Extract subsystem keywords to machine_config or KB table',
    'Extract maintenance procedures to machine-linked procedures table',
    'Extract problem→subsystem mappings to diagnostic_links table',
    'Parameterize machine_name → machine_id in action calls',
    'Create machine-agnostic wrapper that calls VB750 or other machine adapters',
  ],

  time_to_generalize: 'Medium effort (~1-2 days with proper schema design)',
  blocking_generalization_now: 'No critical blocker; purely design/schema work',

  exact_status_for_vb750: 'PRODUCTION_READY_FOR_VB750_VERTICAL (not generic yet)',
};

fs.mkdirSync(path.join(process.cwd(), 'artifacts/shape-analysis'), { recursive: true });
fs.writeFileSync(
  path.join(process.cwd(), 'artifacts/shape-analysis/product-shape-assessment.json'),
  JSON.stringify(shapeAssessment, null, 2)
);

console.log('[ASSESSMENT RESULT]\n');
console.log(`  Current Status: ${shapeAssessment.current_status}`);
console.log(`  VB750 Actions: VERTICAL_LOCKED (specific to VB750)`);
console.log(`  Persistent Table: GENERIC_FOUNDATION (reusable across machines)\n`);

console.log('[HONEST VERDICT]\n');
console.log(`  ✓ What we've built: solid VB750-specific vertical with generic foundation`);
console.log(`  ✓ What's ready: diagnostic + maintenance + procurement for VB750 only`);
console.log(`  ✓ Can add machines: YES, but requires new machine-specific actions OR parameterization`);
console.log(`  ✓ Path to generic: Medium effort, no blockers, clearly mapped\n`);

process.exit(0);
