/**
 * Structural table extractor for maintenance plan PDFs.
 * Uses text layout analysis (not LLM) to recover table structure.
 */

export type StructuralTableRow = {
  service_point: string;
  component: string;
  interval: string;
  page?: string;
};

/**
 * Extract table structure by analyzing text layout within interval blocks.
 * This is a POC for recovering missing points 3-9 from fragmented table data.
 */
export function extractTableStructural(rawText: string): StructuralTableRow[] {
  const rows: StructuralTableRow[] = [];

  // Split by interval sections to handle fragmented tables
  const intervalSections = extractIntervalSections(rawText);

  for (const section of intervalSections) {
    const structuredRows = parseIntervalSection(section.interval, section.text);
    rows.push(...structuredRows);
  }

  return rows;
}

interface IntervalSection {
  interval: string;
  text: string;
}

/**
 * Split text into sections by interval headers
 */
function extractIntervalSections(rawText: string): IntervalSection[] {
  const sections: IntervalSection[] = [];

  // Pattern: "Toutes les X heures..." or similar interval headers
  const intervalPattern = /(Toutes les\s+(\d+)\s*heures?[^]*?)(?=Toutes les|Le cas échéant|$)/gi;

  let match;
  while ((match = intervalPattern.exec(rawText)) !== null) {
    const fullText = match[1];
    const intervalNum = match[2];

    sections.push({
      interval: `${intervalNum}h`,
      text: fullText,
    });
  }

  // Handle "Le cas échéant" section separately
  const asNeededMatch = rawText.match(/(Le cas échéant[^]*?)(?=$|\n9\.|Page)/i);
  if (asNeededMatch) {
    sections.push({
      interval: 'as-needed',
      text: asNeededMatch[1],
    });
  }

  return sections;
}

/**
 * Parse a single interval section to extract point-component pairs.
 * Uses structural analysis: collect numbers and bullets, match by position.
 */
function parseIntervalSection(interval: string, sectionText: string): StructuralTableRow[] {
  const rows: StructuralTableRow[] = [];

  // Extract all standalone numbers (service points)
  const numberLines = sectionText
    .split('\n')
    .map(line => line.trim())
    .filter(line => /^\d+$/.test(line) && line.length <= 2);

  // Extract all component names (lines starting with bullet or "Point/Vérin/Charnières")
  const componentLines = sectionText
    .split('\n')
    .map(line => line.trim())
    .filter(line =>
      line.match(/^[▪•\-*]/) ||
      line.match(/^(Point|Vérin|Charnières|Paliers|Pivot)/)
    )
    .map(line => cleanComponentName(line));

  // Structural matching: assume numbers and components appear in order
  // If we have N numbers and M components, match first M numbers with M components
  const matchCount = Math.min(numberLines.length, componentLines.length);

  for (let i = 0; i < matchCount; i++) {
    const pointNum = numberLines[i];
    const component = componentLines[i];

    if (component && component.length > 2) {
      rows.push({
        service_point: pointNum,
        component,
        interval,
        page: '1', // Assuming single page for now
      });
    }
  }

  return rows;
}

/**
 * Clean component name from extracted text
 */
function cleanComponentName(text: string): string {
  return text
    .replace(/^[▪•\-*]\s*/, '')  // Remove leading bullet
    .replace(/\s*\d+\s*$/, '')   // Remove trailing numbers
    .replace(/[,:;()]/g, '')     // Remove punctuation
    .replace(/\ben option\b/i, '') // Remove "en option"
    .replace(/\s+/g, ' ')        // Normalize whitespace
    .trim();
}
