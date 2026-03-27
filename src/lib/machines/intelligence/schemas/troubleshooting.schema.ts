import { z } from "zod";
import { EvidenceSchema } from "./machineExtraction.schema";

export const StrictFaultSchema = z.object({
  description: z.string().min(5),
  code: z.string().nullish(),
  causes: z.array(z.string()).min(1),
  solutions: z.array(z.string()).min(1),
  severity: z.enum(["low","medium","high","critical"]),
  evidence: z.array(EvidenceSchema).min(1)
});

export const TroubleshootingDocumentSchema = z.object({
  machine_identity: z.object({
    manufacturer: z.string(),
    model: z.string(),
    serial_range: z.string().nullish()
  }),
  systems: z.array(z.string()),
  faults: z.array(StrictFaultSchema),
  technical_parameters: z.record(z.any()),
  summary: z.string()
});
