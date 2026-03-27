import { test, expect } from "@playwright/test";
import { 
  inventoryPartsPages, 
  classifyPartsPage, 
  parsePartsLines, 
  auditPartsPage, 
  runPartsPipeline,
  ParsedPartRow
} from "../src/lib/machines/intelligence/PartsPipeline";

test.describe("PartsPipeline Fail-Closed Logic", () => {
  const mockDocId = "test-doc-123";

  test("Inventory: Should split text into pages correctly", async () => {
    const fullText = "Page 1 Content\n-- 1 of 2 --\nPage 2 Content";
    const inventory = inventoryPartsPages(mockDocId, fullText);
    expect(inventory.length).toBe(2);
    expect(inventory[0].pageNumber).toBe(1);
    expect(inventory[1].pageNumber).toBe(2);
  });

  test("Classification: Should detect PARTS_TABLE from keywords", async () => {
    const inv = {
      documentId: mockDocId,
      pageNumber: 1,
      rawText: "Pos. Qty Part No Description\n1 1 12345 Motor",
      rawLineCount: 2,
      charCount: 50,
      hasTabularSignals: true,
      hasPartSignals: true,
      pageTypeCandidate: "UNKNOWN" as any
    };
    const cls = classifyPartsPage(inv);
    expect(cls.pageType).toBe("PARTS_TABLE");
    expect(cls.confidence).toBeGreaterThan(0.7);
  });

  test("Parsing: Should extract structured lines accurately", async () => {
    const text = "1.1 2 555-ABC Engine Unit";
    const rows = parsePartsLines(mockDocId, 1, text);
    expect(rows.length).toBe(1);
    expect(rows[0].itemNumber).toBe("1.1");
    expect(rows[0].partNumber).toBe("555-ABC");
    expect(rows[0].description).toBe("Engine Unit");
    expect(rows[0].isStructurallyValid).toBe(true);
  });

  test("Audit: Should REJECT a tabular page with 0 valid parts", async () => {
    const cls = {
      documentId: mockDocId,
      pageNumber: 1,
      pageType: "PARTS_TABLE" as any,
      signals: ["tabular_headers_detected"],
      confidence: 0.8
    };
    const rows: ParsedPartRow[] = [{
      documentId: mockDocId,
      pageNumber: 1,
      rowIndex: 0,
      itemNumber: null,
      partNumber: null,
      description: null,
      quantity: null,
      unit: null,
      remarks: null,
      rawSourceLine: "Broken line 123",
      parseConfidence: 0.1,
      parseFlags: ["unparsed_part_candidate"],
      isStructurallyValid: false
    }];
    
    const audit = auditPartsPage(cls, rows);
    expect(audit.finalPageStatus).toBe("REJECTED");
    expect(audit.blockingIssues).toContain("tabular_page_with_zero_valid_parts");
  });

  test("Audit: Should VERIFY a page with high coverage", async () => {
    const cls = {
      documentId: mockDocId,
      pageNumber: 1,
      pageType: "PARTS_TABLE" as any,
      signals: ["tabular_headers_detected"],
      confidence: 0.9
    };
    const rows: ParsedPartRow[] = [{
      documentId: mockDocId,
      pageNumber: 1,
      rowIndex: 0,
      itemNumber: "1",
      partNumber: "PN-100",
      description: "Valid Part",
      quantity: "1",
      unit: null,
      remarks: null,
      rawSourceLine: "1 1 PN-100 Valid Part",
      parseConfidence: 0.9,
      parseFlags: [],
      isStructurallyValid: true
    }];
    
    const audit = auditPartsPage(cls, rows);
    expect(audit.finalPageStatus).toBe("VERIFIED");
    expect(audit.coverageRatio).toBe(1);
  });

  test("Orchestration: Should separate Verified and Unverified parts", async () => {
    const fullText = "Pos Qty PN Desc\n1 1 PN100 Part A\n-- 1 of 2 --\nInvalid page text";
    const result = await runPartsPipeline(mockDocId, fullText);
    
    expect(result.extractedVerifiedParts.length).toBe(1);
    expect(result.pageAudits.length).toBe(2);
    expect(result.pageAudits[1].finalPageStatus).not.toBe("VERIFIED");
  });
});
