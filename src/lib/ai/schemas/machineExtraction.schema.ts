import { z } from "zod";

export const EvidenceSchema = z.object({
  snippet: z.string().optional(),
  page: z.string().optional(),
  language: z.string().optional()
});

export const PartExtractionSchema = z.object({
  parts: z.array(z.object({
    name: z.string(),
    part_number: z.string(),
    function: z.string().optional(),
    system: z.string().optional(),
    criticality: z.string().optional(),
    evidence: z.array(EvidenceSchema).optional()
  }))
});

export const ProcedureExtractionSchema = z.object({
  procedures: z.array(z.object({
    name: z.string(),
    type: z.string().optional(),
    steps: z.array(z.object({
      step_number: z.number(),
      action: z.string(),
      tools: z.array(z.string()).optional(),
      evidence: z.array(EvidenceSchema).optional()
    })),
    evidence: z.array(EvidenceSchema).optional()
  }))
});

export const TroubleshootingExtractionSchema = z.object({
  faults: z.array(z.object({
    code: z.string().optional(),
    description: z.string(),
    causes: z.array(z.string()),
    solutions: z.array(z.string()),
    severity: z.string().optional(),
    evidence: z.array(EvidenceSchema).optional()
  }))
});

// For backward compatibility during refactor
export const MachineExtractionSchema = z.any();
export type MachineExtraction = any;
