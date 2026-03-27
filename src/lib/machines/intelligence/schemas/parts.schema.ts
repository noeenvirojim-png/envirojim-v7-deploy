import { z } from "zod";
import { EvidenceSchema } from "./machineExtraction.schema";

export const StrictPartSchema = z.object({
  name: z.string().min(2),
  part_number: z.string().min(1),
  function: z.string().optional(),
  system: z.string().optional(),
  location: z.string().optional(),
  criticality: z.enum(["low","medium","high","critical"]).default("medium"),
  confidence: z.enum(["low","medium","high"]).default("medium"),
  evidence: z.array(EvidenceSchema).min(1)
});

export const PartsDocumentSchema = z.object({
  machine_identity: z.object({
    manufacturer: z.string(),
    model: z.string(),
    serial_range: z.string().nullish()
  }),
  systems: z.array(z.string()),
  parts: z.array(StrictPartSchema),
  technical_parameters: z.record(z.any()),
  summary: z.string()
});
