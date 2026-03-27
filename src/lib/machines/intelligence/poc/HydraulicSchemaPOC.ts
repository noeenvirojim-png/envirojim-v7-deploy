/**
 * Visual Hydraulic Schematic Extractor
 * Pattern-based extraction for OCR-derived hydraulic schematics.
 * Recovers component names from parenthesized labels + port codes + connection topology.
 * Integrated into main extraction pipeline for document_type="hydraulic_schematics".
 */

export interface VisualSchematicExtraction {
  page: number;
  detected_labels: string[];
  detected_components: Array<{
    name: string;
    type: string;
    language: "de" | "en" | "mixed";
    confidence: number;
    evidence?: Array<{ snippet: string; page: string | number }>;
  }>;
  detected_ports: string[];
  possible_connections: Array<{
    from: string;
    to: string;
    type: string;
  }>;
  confidence_notes: string;
}

export async function extractHydraulicSchemaVisualPOC(
  pdfText: string,
  pageNumber: number = 1
): Promise<VisualSchematicExtraction> {
  const lines = pdfText.split("\n").map((l) => l.trim());

  // Component type patterns (DE + EN)
  const componentPatterns = {
    pump: /pompe|pump|verstellpumpe|variable pump/i,
    motor: /moteur|motor|verstellmotor|variable displacement motor/i,
    valve: /ventil|valve|soupape|clapet/i,
    filter: /filtre|filter/i,
    cylinder: /vérin|cylindre|cylinder/i,
    accumulator: /accumulateur|accumulator|speicher/i,
    pressure_relief: /soupape de débordement|pressure relief|druckbegrenzung/i,
  };

  // Port codes
  const portPattern = /\b([A-Z0-9]+(?:L|R)?)\b/;
  const knownPorts = new Set([
    "A",
    "B",
    "P",
    "T",
    "A1",
    "A2",
    "A3",
    "B1",
    "B2",
    "B3",
    "A1L",
    "A1R",
    "B1L",
    "B1R",
  ]);

  // Extract labels (text in parentheses)
  const labels: string[] = [];
  const labelPattern = /\(([^)]+)\)/g;
  let match;
  while ((match = labelPattern.exec(pdfText)) !== null) {
    labels.push(match[1].trim());
  }

  // Extract components
  const components: VisualSchematicExtraction["detected_components"] = [];
  const seenComponents = new Set<string>();

  for (const label of labels) {
    for (const [type, pattern] of Object.entries(componentPatterns)) {
      if (pattern.test(label) && !seenComponents.has(label)) {
        seenComponents.add(label);
        components.push({
          name: label,
          type: type as keyof typeof componentPatterns,
          language: /ä|ö|ü|ß/.test(label) ? "de" : /left|right|pump|motor/.test(label) ? "en" : "mixed",
          confidence: 0.85,
          evidence: [
            {
              snippet: `Component detected from schematic label: "${label}"`,
              page: pageNumber,
            },
          ],
        });
        break;
      }
    }
  }

  // Extract ports (standalone letter/code tokens)
  const ports = new Set<string>();
  for (const line of lines) {
    const tokens = line.split(/[\s\t,]/);
    for (const token of tokens) {
      if (knownPorts.has(token) && !ports.has(token)) {
        ports.add(token);
      }
    }
  }

  // Simple heuristic for connections: look for adjacent component+port patterns
  const connections: VisualSchematicExtraction["possible_connections"] = [];
  const portArray = Array.from(ports);

  // If we have pump/motor + ports, suggest possible connections
  const hasPump = components.some((c) => c.type === "pump");
  const hasMotor = components.some((c) => c.type === "motor");

  if (hasPump && portArray.includes("P") && portArray.includes("A")) {
    connections.push({
      from: "pump",
      to: "motor/valve",
      type: "pressure (P)",
    });
  }
  if ((hasPump || hasMotor) && portArray.includes("T")) {
    connections.push({
      from: "component",
      to: "tank",
      type: "return (T)",
    });
  }

  return {
    page: pageNumber,
    detected_labels: labels.slice(0, 50), // Limit to 50 for sanity
    detected_components: components,
    detected_ports: Array.from(ports).sort(),
    possible_connections: connections,
    confidence_notes:
      "POC-level extraction from OCR text fragments. Labels from parenthesized text. Components inferred from language patterns. Ports from known port code tokens. Connections are heuristic-based on component types + port presence. Visual relationships not recovered (requires image analysis).",
  };
}
