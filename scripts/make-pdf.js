const fs = require('fs');
const path = require('path');

// Simple PDF 1.4 template with dynamic content length
function createSimplePDF(text) {
  const content = `BT /F1 12 Tf 50 700 Td (${text.replace(/\n/g, ') Tj 0 -15 Td (')}) ET`;
  const stream = `<< /Length ${content.length} >>\nstream\n${content}\nendstream`;
  
  const obj1 = `1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj`;
  const obj2 = `2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj`;
  const obj3 = `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>\nendobj`;
  const obj4 = `4 0 obj\n${stream}\nendobj`;
  
  const startObj1 = 9;
  const startObj2 = startObj1 + obj1.length + 1;
  const startObj3 = startObj2 + obj2.length + 1;
  const startObj4 = startObj3 + obj3.length + 1;
  const startXref = startObj4 + obj4.length + 1;
  
  const pdf = `%PDF-1.4\n${obj1}\n${obj2}\n${obj3}\n${obj4}\nxref\n0 5\n0000000000 65535 f \n${String(startObj1).padStart(10, '0')} 00000 n \n${String(startObj2).padStart(10, '0')} 00000 n \n${String(startObj3).padStart(10, '0')} 00000 n \n${String(startObj4).padStart(10, '0')} 00000 n \ntrailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n${startXref}\n%%EOF`;
  
  return Buffer.from(pdf, 'utf-8');
}

const manualContent = `
TITAN 500 INDUSTRIAL PUMP MANUAL
Model: Titan-500-X1
Manufacturer: EnviroJim Systems

PARTS LIST
- Item: Hydraulic Seal, P/N: HS-99, Criticality: High.
- Item: Pressure Valve, P/N: PV-22, Criticality: Medium.

MAINTENANCE PROCEDURES
Procedure: Quarterly Inspection
1. Verify oil levels in the main reservoir.
2. Check for leaks around the HS-99 seal.
3. Calibrate the PV-22 valve.

FAULT DETECTION
Fault: Low Discharge Pressure
Symptoms: Reduced flow rate, erratic gauge readings.
Root Cause: Worn hydraulic seal (HS-99).
Correction: Replace seal and reset the unit.
`;

const buffer = createSimplePDF(manualContent);
fs.writeFileSync(path.join(__dirname, 'valid-test.pdf'), buffer);
console.log('Created valid-test.pdf with real content');
