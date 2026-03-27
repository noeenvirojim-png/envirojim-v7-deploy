import { z } from "zod";

export const EvidenceSchema = z.object({
  snippet: z.string(),
  page: z.coerce.string()
});

export const MachinePartSchema = z.object({
  name: z.string().min(1),
  part_number: z.string().min(1),
  system: z.string().optional(),
  function: z.string().optional(),
  confidence: z.enum(["low", "medium", "high"]),
  evidence: z.array(EvidenceSchema)
});

export const MachineInventorySchema = z.object({
  parts: z.array(MachinePartSchema)
});

export type MachineInventory = z.infer<typeof MachineInventorySchema>;
