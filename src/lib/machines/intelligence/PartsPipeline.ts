import type { ExtractedPdfPage } from "../../../domain/ai/utils/pdf-page-extractor";

export type PartsPageInventory = {
  documentId: string;
  pageNumber: number;
  rawText: string;
  rawLineCount: number;
  charCount: number;
  hasTabularSignals: boolean;
  hasPartSignals: boolean;
  pageTypeCandidate: "PARTS_TABLE" | "PARTS_MIXED" | "DIAGRAM" | "PROCEDURE" | "REFERENCE" | "UNKNOWN";
};

export type PartsPageClassification = {
  documentId: string;
  pageNumber: number;
  pageType: "PARTS_TABLE" | "PARTS_MIXED" | "DIAGRAM" | "PROCEDURE" | "REFERENCE" | "UNKNOWN";
  signals: string[];
  confidence: number;
};

export type ParsedPartRow = {
  documentId: string;
  pageNumber: number;
  rowIndex: number;
  itemNumber: string | null;
  partNumber: string | null;
  description: string | null;
  quantity: string | null;
  unit: string | null;
  remarks: string | null;
  rawSourceLine: string;
  parseConfidence: number;
  parseFlags: string[];
  isStructurallyValid: boolean;
};

export type PartsPageAudit = {
  documentId: string;
  pageNumber: number;
  pageType: "PARTS_TABLE" | "PARTS_MIXED" | "DIAGRAM" | "PROCEDURE" | "REFERENCE" | "UNKNOWN";
  estimatedStructuredRowCount: number;
  parsedRowCount: number;
  validRowCount: number;
  emptyOrRejectedRowCount: number;
  coverageRatio: number;
  blockingIssues: string[];
  warningIssues: string[];
  finalPageStatus: "VERIFIED" | "REVIEW_REQUIRED" | "REJECTED";
};

export type PartsExtractionResult = {
  pageInventory: PartsPageInventory[];
  pageClassifications: PartsPageClassification[];
  pageAudits: PartsPageAudit[];
  extractedVerifiedParts: ParsedPartRow[];
  extractedUnverifiedParts: ParsedPartRow[];
};

/**
 * Builds page inventory from native PDF-extracted pages.
 * Replaces the old regex-based page splitting entirely.
 */
export function inventoryPartsPages(documentId: string, pages: ExtractedPdfPage[]): PartsPageInventory[] {
  return pages
    .filter(p => p.text.trim().length > 0)
    .map((page) => {
      const text = page.text;
      const lines = text.split("\n").filter(l => l.trim().length > 0);
      const hasTabularSignals = /pos\.|stk\.|qty|article|bezeichnung|part no|drawing/i.test(text);
      const hasPartSignals = /[A-Z0-9-]{5,20}/.test(text);

      return {
        documentId,
        pageNumber: page.pageNumber,
        rawText: text,
        rawLineCount: lines.length,
        charCount: text.length,
        hasTabularSignals,
        hasPartSignals,
        pageTypeCandidate: "UNKNOWN" as const,
      };
    });
}

/**
 * Classifies a page based on heuristic signals.
 */
export function classifyPartsPage(inventory: PartsPageInventory): PartsPageClassification {
  const signals: string[] = [];
  let pageType: PartsPageClassification["pageType"] = "UNKNOWN";
  let confidence = 0.5;

  if (inventory.hasTabularSignals) {
    signals.push("tabular_headers_detected");
    pageType = "PARTS_TABLE";
    confidence = 0.8;
  }

  if (inventory.hasPartSignals && inventory.rawLineCount > 5) {
    signals.push("dense_alphanumeric_patterns");
    if (pageType === "PARTS_TABLE") {
       confidence = 0.95;
    } else {
       pageType = "PARTS_MIXED";
    }
  }

  if (inventory.rawText.includes("Abb.") || inventory.rawText.includes("Fig.")) {
    signals.push("diagram_references");
    if (pageType === "UNKNOWN") pageType = "DIAGRAM";
  }

  return {
    documentId: inventory.documentId,
    pageNumber: inventory.pageNumber,
    pageType,
    signals,
    confidence
  };
}

/**
 * Parses lines in a parts table page.
 */
export function parsePartsLines(documentId: string, pageNumber: number, rawText: string): ParsedPartRow[] {
  const lines = rawText.split("\n");
  const parsedRows: ParsedPartRow[] = [];

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (trimmed.length < 5) return;

    const flags: string[] = [];
    const isHeader = /pos\.|stk\.|qty|article|bezeichnung|part no|drawing|katalog|type\/|designation|comment/i.test(trimmed);

    if (isHeader) return;

    // Pattern 1: Tabular format [Pos] [Qty] [Code/Name] [Description] [Type/Drawing] [Remarks]
    // Accepts: "1 1 VB 750 DK 0770 90 00 01 00 3" or "1 Paar 21926 Kettenlaufwerk T0150A168W"
    const tabularPattern = /^([\d.]+)?\s+([\d\s.]+|[A-Z\u00C4\u00D6\u00DCa-z\u00E4\u00F6\u00FC]+)\s+([A-Z0-9.\-/]{4,})\s+(.+)$/i;
    const match = trimmed.match(tabularPattern);

    if (match) {
      // Extract the most relevant part number (longest alphanumeric sequence)
      const descriptionField = match[4];
      const partNumberMatch = descriptionField.match(/[A-Z0-9]{4,}[\s0-9.\-/A-Z]*/i);
      const detectedPartNumber = partNumberMatch ? partNumberMatch[0].trim() : match[3];

      parsedRows.push({
        documentId,
        pageNumber,
        rowIndex: index,
        itemNumber: match[1] || null,
        quantity: /[A-Z]/i.test(match[2]) ? match[2] : (match[2] ? match[2].trim() : null),
        partNumber: detectedPartNumber,
        description: match[3] + " " + match[4],
        unit: null,
        remarks: null,
        rawSourceLine: trimmed,
        parseConfidence: 0.85,
        parseFlags: flags,
        isStructurallyValid: true
      });
    } else if (/[A-Z0-9]{5,}/.test(trimmed)) {
      // Fallback: any line with substantial alphanumeric code
      flags.push("unparsed_part_candidate");
      parsedRows.push({
        documentId,
        pageNumber,
        rowIndex: index,
        itemNumber: null,
        partNumber: null,
        description: trimmed,
        quantity: null,
        unit: null,
        remarks: null,
        rawSourceLine: trimmed,
        parseConfidence: 0.3,
        parseFlags: flags,
        isStructurallyValid: false
      });
    }
  });

  return parsedRows;
}

/**
 * Audits a page to determine if it meets coverage requirements.
 */
export function auditPartsPage(
  classification: PartsPageClassification,
  parsedRows: ParsedPartRow[]
): PartsPageAudit {
  const validRows = parsedRows.filter(r => r.isStructurallyValid && r.partNumber);
  const structurallyValidRows = parsedRows.filter(r => r.isStructurallyValid);
  const rejections = parsedRows.filter(r => !r.isStructurallyValid);

  const estimatedRowCount = parsedRows.length;
  const coverageRatio = estimatedRowCount > 0 ? validRows.length / estimatedRowCount : 0;

  const blockingIssues: string[] = [];
  const warningIssues: string[] = [];

  // For PARTS_TABLE pages: accept if structurally valid rows detected, even if part_number incomplete
  // This allows recovery of multilingual/tabular parts catalogs where part identification spans columns
  if (classification.pageType === "PARTS_TABLE" && structurallyValidRows.length === 0) {
    blockingIssues.push("tabular_page_with_zero_valid_parts");
  } else if (classification.pageType === "PARTS_TABLE" && validRows.length === 0 && structurallyValidRows.length > 0) {
    // Structural rows detected but part_number extraction incomplete - accept as REVIEW_REQUIRED
    warningIssues.push("parts_table_detected_part_numbers_incomplete");
  }

  if (coverageRatio < 0.5 && estimatedRowCount > 5) {
    blockingIssues.push("low_coverage_ratio");
  }

  let finalPageStatus: PartsPageAudit["finalPageStatus"] = "VERIFIED";
  if (blockingIssues.length > 0) {
    finalPageStatus = "REJECTED";
  } else if (coverageRatio < 0.8 || classification.pageType === "UNKNOWN") {
    finalPageStatus = "REVIEW_REQUIRED";
  }

  return {
    documentId: classification.documentId,
    pageNumber: classification.pageNumber,
    pageType: classification.pageType,
    estimatedStructuredRowCount: estimatedRowCount,
    parsedRowCount: parsedRows.length,
    validRowCount: validRows.length,
    emptyOrRejectedRowCount: rejections.length,
    coverageRatio,
    blockingIssues,
    warningIssues,
    finalPageStatus
  };
}

/**
 * Main Orchestrator for the Parts Pipeline.
 * Accepts native ExtractedPdfPage[] — no regex page splitting.
 */
export async function runPartsPipeline(documentId: string, pages: ExtractedPdfPage[]): Promise<PartsExtractionResult> {
  const pageInventory = inventoryPartsPages(documentId, pages);
  const pageClassifications = pageInventory.map(classifyPartsPage);

  const result: PartsExtractionResult = {
    pageInventory,
    pageClassifications,
    pageAudits: [],
    extractedVerifiedParts: [],
    extractedUnverifiedParts: []
  };

  for (const classification of pageClassifications) {
    const inventory = pageInventory.find(p => p.pageNumber === classification.pageNumber);
    if (!inventory) continue;

    const parsedRows = parsePartsLines(documentId, classification.pageNumber, inventory.rawText);
    const audit = auditPartsPage(classification, parsedRows);

    result.pageAudits.push(audit);

    // Accept VERIFIED pages and REVIEW_REQUIRED PARTS_TABLE pages with structural rows
    const shouldIncludeAsVerified =
      audit.finalPageStatus === "VERIFIED" ||
      (audit.finalPageStatus === "REVIEW_REQUIRED" && classification.pageType === "PARTS_TABLE" && parsedRows.some(r => r.isStructurallyValid));

    if (shouldIncludeAsVerified) {
      result.extractedVerifiedParts.push(...parsedRows.filter(r => r.isStructurallyValid));
    } else {
      result.extractedUnverifiedParts.push(...parsedRows);
    }
  }

  return result;
}
