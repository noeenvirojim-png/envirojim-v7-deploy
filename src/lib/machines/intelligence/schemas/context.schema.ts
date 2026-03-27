import { z } from "zod";

export const ContextDocumentSchema = z.object({
  machine_identity: z.object({
    manufacturer: z.string(),
    model: z.string(),
    serial_range: z.string().nullish()
  }),
  systems: z.array(z.string()),
  summary: z.string(),
  safety_notes: z.array(z.string()).optional(),
  technical_parameters: z.record(z.any()).default({})
});
