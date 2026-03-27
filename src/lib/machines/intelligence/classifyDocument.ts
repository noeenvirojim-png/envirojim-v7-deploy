import { DocumentType } from "./documentTypes";

export function classifyDocument(fileName: string, text?: string): DocumentType {
  const name = fileName.toLowerCase();

  if (name.includes("spare parts") || name.includes("assemblies") || name.includes("ersatzteile")) {
    return "parts_catalog";
  }

  if (
    name.includes("schémas électriques") ||
    name.includes("schéma électrique") ||
    name.includes("schéma de connexions") ||
    name.includes("connecteurs")
  ) {
    return "electrical_schematics";
  }

  if (name.includes("hydraulique") || name.includes("hydraulic")) {
    return "hydraulic_schematics";
  }

  if (name.includes("dérangements") || name.includes("troubleshooting")) {
    return "troubleshooting";
  }

  if (name.includes("fonctionnement") || name.includes("operation")) {
    return "operation";
  }

  if (name.includes("entretien") || name.includes("maintenance")) {
    return "maintenance";
  }

  if (name.includes("sécurité") || name.includes("safety")) {
    return "safety";
  }

  if (name.includes("nettoyage") || name.includes("cleaning")) {
    return "cleaning";
  }

  if (name.includes("mise en service") || name.includes("startup")) {
    return "startup";
  }

  if (name.includes("utilisation conforme")) {
    return "intended_use";
  }

  if (name.includes("introduction")) {
    return "introduction";
  }

  if (name.includes("couverture")) {
    return "cover";
  }

  if (name.includes("graissage") || name.includes("lubrication") || name.includes("grease")) {
    return "maintenance";
  }

  return "other";
}
