import type {
  BuildState,
  BuildAppearance,
  BuildComponent,
  BuildTask,
} from "./schema";
import type { Vehicle } from "../data/catalog";
export type PublicComponent = Pick<
  BuildComponent,
  | "system"
  | "kind"
  | "partId"
  | "number"
  | "name"
  | "manufacturer"
  | "productCode"
  | "quantity"
  | "stage"
  | "publicNotes"
  | "guideIds"
  | "fabrication"
  | "wheelFitment"
> & { estimate?: number | null; actual?: number | null };
export type PublicBuild = {
  schemaVersion: 1;
  title: string;
  description: string;
  style: BuildState["style"];
  lifecycle: BuildState["lifecycle"];
  reference: BuildState["reference"];
  configuration: Vehicle;
  appearance: BuildAppearance;
  components: PublicComponent[];
  tasks: Pick<
    BuildTask,
    | "title"
    | "system"
    | "status"
    | "guideId"
    | "dueOn"
    | "completedOn"
    | "notes"
  >[];
  milestones: Pick<
    BuildState["milestones"][number],
    "title" | "date" | "notes"
  >[];
  currency: string;
  photos: string[];
};
export type BuildPublication = {
  id: string;
  owner_id: string;
  version: number;
  snapshot: PublicBuild;
  published: boolean;
  hidden: boolean;
  created_at: string;
  updated_at: string;
};
export function publicProjection(
  s: BuildState,
  photos: string[] = [],
): PublicBuild {
  return {
    schemaVersion: 1,
    title: s.title,
    description: s.publicDescription,
    style: s.style,
    lifecycle: s.lifecycle,
    reference: { ...s.reference },
    configuration: { ...s.targetConfiguration },
    appearance: structuredClone(s.appearance),
    currency: s.currency,
    photos: [...photos],
    components: s.components.map((c) => ({
      system: c.system,
      kind: c.kind,
      partId: c.partId,
      number: c.number,
      name: c.name,
      manufacturer: c.manufacturer,
      productCode: c.productCode,
      quantity: c.quantity,
      stage: c.stage,
      publicNotes: c.publicNotes,
      guideIds: [...c.guideIds],
      fabrication: c.fabrication,
      wheelFitment: c.wheelFitment,
      ...(c.publicCost ? { estimate: c.estimate, actual: c.actual } : {}),
    })),
    tasks: s.tasks
      .filter((t) => t.public)
      .map((t) => ({
        title: t.title,
        system: t.system,
        status: t.status,
        guideId: t.guideId,
        dueOn: t.dueOn,
        completedOn: t.completedOn,
        notes: t.notes,
      })),
    milestones: s.milestones
      .filter((m) => m.public)
      .map((m) => ({ title: m.title, date: m.date, notes: m.notes })),
  };
}
export function publicTextContainsVin(snapshot: PublicBuild) {
  return /(?:^|[^a-z0-9])[a-hj-npr-z0-9]{17}(?:[^a-z0-9]|$)/i.test(
    JSON.stringify(snapshot),
  );
}
