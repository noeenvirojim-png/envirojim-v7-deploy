export type DocumentType =
  | "cover"
  | "introduction"
  | "intended_use"
  | "safety"
  | "operation"
  | "maintenance"
  | "troubleshooting"
  | "parts_catalog"
  | "electrical_schematics"
  | "electrical_parts"
  | "hydraulic_schematics"
  | "hydraulic_parts"
  | "lubrication"
  | "cleaning"
  | "startup"
  | "movement"
  | "appendix"
  | "other";

export function classifyDocument(filename: string, rawText?: string): DocumentType {
  const lowerFile = filename.toLowerCase();
  
  // 1. Precise Filename Mapping (VB750 prioritized)
  if (lowerFile.includes("couverture")) return "cover";
  if (lowerFile.includes("introduction")) return "introduction";
  if (lowerFile.includes("utilisation conforme")) return "intended_use";
  if (lowerFile.includes("sécurité") || lowerFile.includes("securite")) return "safety";
  if (lowerFile.includes("mise en service")) return "startup";
  if (lowerFile.includes("fonctionnement")) return "operation";
  if (lowerFile.includes("déplacement") || lowerFile.includes("deplacement")) return "movement";
  if (lowerFile.includes("reconcassage")) return "operation"; // Specific to VB750
  if (lowerFile.includes("entretien") || lowerFile.includes("maintenance")) return "maintenance";
  if (lowerFile.includes("graissage") || lowerFile.includes("lubrication")) return "lubrication";
  if (lowerFile.includes("nettoyage")) return "cleaning";
  if (lowerFile.includes("dérangements") || lowerFile.includes("troubleshooting") || lowerFile.includes("solutionnement")) return "troubleshooting";
  
  if (lowerFile.includes("assemblies and spare parts") || lowerFile.includes("ersatzteile")) return "parts_catalog";
  
  if (lowerFile.includes("schémas électriques") || lowerFile.includes("schéma de connexions") || lowerFile.includes("schéma de connecteurs")) return "electrical_schematics";
  if (lowerFile.includes("liste des matériaux") && lowerFile.includes("1208")) return "electrical_parts"; // VB750 specific logic
  
  if (lowerFile.includes("schéma hydraulique")) return "hydraulic_schematics";
  if (lowerFile.includes("parts list hydraulic") || lowerFile.includes("parts list water sprinkling")) return "hydraulic_parts";
  
  if (lowerFile.includes("annexe")) return "appendix";
  if (lowerFile.includes("instructions brève")) return "introduction";

  // 2. Textual markers fallback (Strict)
  if (rawText) {
    const lowerText = rawText.toLowerCase();
    if (lowerText.includes("pièces de rechange") || lowerText.includes("spare parts")) return "parts_catalog";
    if (lowerText.includes("circuit diagram") || lowerText.includes("schaltplan")) return "electrical_schematics";
    if (lowerText.includes("maintenance schedule") || lowerText.includes("plan d'entretien")) return "maintenance";
  }

  return "other";
}
