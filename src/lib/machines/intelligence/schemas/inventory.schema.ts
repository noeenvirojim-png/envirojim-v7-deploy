import { z } from "zod";

export const InventoryExtractionSchema = z.object({
  document_type: z.string(),
  manufacturer: z.string().optional().nullable(),
  model: z.string().optional().nullable(),
  serial_range: z.string().optional().nullable(),
  systems: z.array(z.string()),
  language: z.string(),
  title_detected: z.string(),
  machine_reference_detected: z.string(),
  short_summary: z.string(),
  flags: z.object({
    has_parts_data: z.boolean(),
    has_procedure_data: z.boolean(),
    has_fault_data: z.boolean(),
    has_electrical_content: z.boolean(),
    has_hydraulic_content: z.boolean()
  })
});

export type InventoryExtraction = z.infer<typeof InventoryExtractionSchema>;
