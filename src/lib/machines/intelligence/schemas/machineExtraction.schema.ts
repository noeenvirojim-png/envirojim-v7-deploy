import { z } from "zod";

export const EvidenceSchema = z.object({
  snippet: z.string().min(5),
  page: z.coerce.string(),
  section: z.string().optional(),
  language: z.string()
});

export const PartSchema = z.object({
  name: z.string().min(2),
  part_number: z.string().min(1),
  function: z.string().min(5),
  system: z.string(),
  criticality: z.enum(["low","medium","high","critical"]),
  confidence: z.enum(["low","medium","high"]),
  evidence: z.array(EvidenceSchema).min(1)
});

export const ProcedureStepSchema = z.object({
  step_number: z.number(),
  action: z.string().min(5),
  tools: z.array(z.string()),
  warnings: z.array(z.string()),
  duration_estimate: z.string().nullish(),
  evidence: z.array(EvidenceSchema).min(1)
});

export const ProcedureSchema = z.object({
  name: z.string(),
  type: z.enum(["maintenance","repair","operation","diagnostic"]),
  steps: z.array(ProcedureStepSchema).min(1),
  frequency: z.string().nullish(),
  evidence: z.array(EvidenceSchema).min(1)
});

export const FaultSchema = z.object({
  code: z.string().nullish(),
  description: z.string().min(5),
  causes: z.array(z.string()),
  solutions: z.array(z.string()),
  severity: z.enum(["low","medium","high","critical"]),
  evidence: z.array(EvidenceSchema).min(1)
});

export const MachineExtractionSchema = z.object({
  machine_identity: z.object({
    manufacturer: z.string(),
    model: z.string(),
    serial_range: z.string().nullish()
  }),
  systems: z.array(z.string()),
  parts: z.array(PartSchema),
  procedures: z.array(ProcedureSchema),
  faults: z.array(FaultSchema),
  technical_parameters: z.record(z.string()),
  summary: z.string()
});

export type MachineExtraction = z.infer<typeof MachineExtractionSchema>;
