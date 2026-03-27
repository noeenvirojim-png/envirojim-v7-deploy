import { z } from "zod";
import { EvidenceSchema } from "./machineExtraction.schema";

export const HydraulicSchematicSchema = z.object({
  machine_identity: z.object({
    manufacturer: z.string(),
    model: z.string(),
    serial_range: z.string().nullish()
  }),
  systems: z.array(z.string()),
  hydraulic_components: z.array(z.object({
    id: z.string(),
    type: z.string(),
    label: z.string()
  })),
  lines_or_flows: z.array(z.string()),
  references: z.array(z.string()),
  technical_parameters: z.record(z.any()),
  summary: z.string()
});
