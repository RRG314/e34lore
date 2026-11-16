import { z } from "zod";
import type { WorkshopState, TwinGraph } from "./types";
import { validateWorkshop } from "./graph";
const ids = z
  .array(z.string().min(1).max(160))
  .max(10000)
  .refine((a) => new Set(a).size === a.length, "Duplicate component identity");
const snapshot = z
  .object({
    removed: ids,
    hidden: ids,
    detached: ids,
    selected: z.string().max(160).nullable(),
    explosion: z.number().finite().min(0).max(1),
  })
  .strict();
export const workshopSchema = z
  .object({
    schemaVersion: z.literal(1),
    graphId: z.string().min(1).max(160),
    graphRevision: z.string().min(1).max(160),
    mode: z.enum(["explore", "constrained"]),
    present: snapshot,
    past: z.array(snapshot).max(100),
    future: z.array(snapshot).max(100),
  })
  .strict();
export function parseWorkshop(input: unknown, graph: TwinGraph): WorkshopState {
  if (JSON.stringify(input).length > 500000)
    throw Error("Workshop file exceeds 500 KB.");
  const parsed = workshopSchema.parse(input);
  const errors = validateWorkshop(graph, parsed);
  if (errors.length) throw Error(errors.join(" "));
  return parsed;
}
