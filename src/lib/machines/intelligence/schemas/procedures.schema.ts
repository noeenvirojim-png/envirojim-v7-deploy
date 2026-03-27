import { z } from "zod";
import { EvidenceSchema } from "./machineExtraction.schema";

export const StrictProcedureStepSchema = z.object({
  step_number: z.number(),
  action: z.string().min(5),
  tools: z.array(z.string()),
  warnings: z.array(z.string()),
  duration_estimate: z.string().nullish(),
  evidence: z.array(EvidenceSchema).min(1)
});

export const StrictProcedureSchema = z.object({
  name: z.string().min(2),
  type: z.enum(["maintenance","repair","operation","diagnostic"]),
  steps: z.array(StrictProcedureStepSchema).min(1),
  frequency: z.string().nullish(),
  evidence: z.array(EvidenceSchema).min(1)
});

export const ProcedureDocumentSchema = z.object({
  machine_identity: z.object({
    manufacturer: z.string(),
    model: z.string(),
    serial_range: z.string().nullish()
  }),
  systems: z.array(z.string()),
  procedures: z.array(StrictProcedureSchema),
  technical_parameters: z.record(z.any()),
  summary: z.string()
});
