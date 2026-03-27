import { test, expect } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import { 
  runPartsPipeline, 
  inventoryPartsPages, 
  classifyPartsPage, 
  parsePartsLines, 
  auditPartsPage 
} from "../../src/lib/machines/intelligence/PartsPipeline";

test.describe("GATE 8 — Fail-Closed Parts Pipeline Integration", () => {
  const fixturePath = path.join(__dirname, "../fixtures/parts_catalog_realistic.txt");
  const rawText = fs.readFileSync(fixturePath, "utf-8");
  const mockDocId = "real-test-uuid";

  test("1. REAL_CLASSIFICATION: Should detect PARTS_TABLE from realistic text", async () => {
    const inventory = inventoryPartsPages(mockDocId, rawText);
    const classification = classifyPartsPage(inventory[0]);
    expect(classification.pageType).toBe("PARTS_TABLE");
    expect(classification.signals).toContain("tabular_headers_detected");
  });

  test("2. REAL_PARSING: Should extract a complete part line accurately", async () => {
    const line = "1 1 12345 Motor CAT C9.3B";
    const rows = parsePartsLines(mockDocId, 1, line);
    expect(rows.length).toBe(1);
    expect(rows[0].partNumber).toBe("12345");
    expect(rows[0].description).toBe("Motor CAT C9.3B");
    expect(rows[0].isStructurallyValid).toBe(true);
  });

  test("3. FAIL_CLOSED_AUDIT: Should REJECT a table page with 0 rows", async () => {
    const fakeCls = {
      documentId: mockDocId,
      pageNumber: 99,
      pageType: "PARTS_TABLE" as any,
      signals: ["tabular_headers_detected"],
      confidence: 0.9
    };
    const audit = auditPartsPage(fakeCls, []);
    expect(audit.finalPageStatus).toBe("REJECTED");
    expect(audit.blockingIssues).toContain("tabular_page_with_zero_valid_parts");
  });

  test("4. END_TO_END_INTEGRATION: Should separate VERIFIED from UNVERIFIED in full run", async () => {
    const result = await runPartsPipeline(mockDocId, rawText);
    
    // Debug info
    console.log("Page Audits:", JSON.stringify(result.pageAudits, null, 2));
    
    const verifiedPages = result.pageAudits.filter(a => a.finalPageStatus === "VERIFIED");
    const unverifiedRows = result.extractedUnverifiedParts;
    
    expect(verifiedPages.length).toBeGreaterThan(0);
    expect(verifiedPages[0].pageNumber).toBe(1);
    
    expect(result.extractedVerifiedParts.length).toBe(3); // Page 1 (2) + Page 2 (1)
    expect(unverifiedRows.length).toBeGreaterThan(0); // Page 3 is unverified
    
    // Check coverage ratio on page 1
    const p1Audit = result.pageAudits.find(a => a.pageNumber === 1);
    expect(p1Audit?.coverageRatio).toBeGreaterThan(0);
  });
});
