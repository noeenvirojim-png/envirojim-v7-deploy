import { classifyDocument } from "../src/lib/machines/intelligence/classifyDocument";

function testTaxonomy() {
  const cases = [
    { name: "Spare_Parts.pdf", expected: "parts_catalog" },
    { name: "Hydraulic_Diagram.pdf", expected: "hydraulic_schematics" },
    { name: "Electrical_v2.pdf", expected: "electrical_schematics" },
    { name: "Maintenance_Manual.pdf", expected: "maintenance" },
    { name: "Safety_Instructions.pdf", expected: "safety" },
    { name: "Troubleshooting.pdf", expected: "troubleshooting" },
    { name: "Dérangements.pdf", expected: "troubleshooting" },
    { name: "Operation.pdf", expected: "operation" },
    { name: "Introduction.pdf", expected: "introduction" },
    { name: "Cover_Page.pdf", expected: "cover" },
    { name: "Random_Doc.pdf", expected: "other" }
  ];

  console.log("UNIT TEST 1: TAXONOMY");
  let passed = 0;
  for (const c of cases) {
    const result = classifyDocument(c.name, "");
    if (result === c.expected) {
      console.log(`PASS: ${c.name} -> ${result}`);
      passed++;
    } else {
      console.log(`FAIL: ${c.name} -> expected ${c.expected}, got ${result}`);
    }
  }

  if (passed === cases.length) {
    console.log("UNIT TEST 1 STATUS: PASS");
  } else {
    console.log("UNIT TEST 1 STATUS: FAIL");
    process.exit(1);
  }
}

testTaxonomy();
