import { buildId } from "./id";
import {localWheelPackages} from "./local-wheel-packages";
import { z } from "zod";
import { emptyVehicle } from "../data/catalog";
import {
  referencesForSeries,
  defaultVehicleReferenceId,
} from "../digital-twin/public/load-reference";
import { seriesForModel } from '../series/registry';
import { referenceVehicle } from "../vehicle/reference-context";
const id = z.string().regex(/^[a-zA-Z0-9:_-]{1,100}$/),
  text = (n: number) => z.string().max(n),
  hex = z.string().regex(/^#[a-fA-F0-9]{6}$/),
  money = z.number().int().min(0).max(100000000000).nullable();
export const buildSystems = [
  "engine",
  "transmission",
  "differential",
  "driveshaft",
  "suspension",
  "steering",
  "brakes",
  "wheels",
  "cooling",
  "exhaust",
  "intake",
  "electrical",
  "ecu",
  "fuel",
  "body",
  "interior",
  "accessories",
] as const;
export const buildStyles = [
  "factory",
  "restoration",
  "period",
  "alpina-inspired",
  "schnitzer-inspired",
  "hartge-inspired",
  "bbs-inspired",
  "street",
  "track",
  "engine-swap",
  "custom-interior",
  "experimental",
] as const;
export const workStages = [
  "planned",
  "researched",
  "purchased",
  "received",
  "working",
  "installed",
  "tested",
  "verified",
  "deferred",
] as const;
export const workStageSchema = z.enum(workStages);
export const vehicleSchema = z
  .object({
    model: text(80),
    engine: text(80),
    year: text(4),
    month: text(2),
    market: text(40),
    body: text(40),
    transmission: text(40),
    steering: text(40),
  })
  .strict();
export const appearanceSchema = z
  .object({
    paint: z
      .object({
        enabled: z.boolean(),
        color: hex,
        finish: z.enum(["gloss", "satin", "matte", "metallic"]),
        factoryCode: z
          .string()
          .regex(/^\d{3}$/)
          .nullable(),
      })
      .strict(),
    upholstery: z
      .object({
        enabled: z.boolean(),
        color: hex,
        finish: z.enum(["fabric", "leather"]),
      })
      .strict(),
    trim: z.object({ enabled: z.boolean(), color: hex }).strict(),
    wheels: z
      .object({
        finishEnabled: z.boolean().optional(),
        packageId: z.enum([
          "reference",
          "e34-original-ten-spoke-v1",
          "e34-artist-wheel-v1",
          ...localWheelPackages.map(wheel=>wheel.id),
        ]),
        color: hex,
        scale: z.number().min(0.9).max(1.12),
        widthScale: z.number().min(0.85).max(1.15),
      })
      .strict(),
    rideHeight: z.number().min(-1).max(1),
    engineAccent: z.object({ enabled: z.boolean(), color: hex }).strict(),
    quality: z.enum(["low", "balanced", "high"]),
  })
  .strict();
export type BuildAppearance = z.infer<typeof appearanceSchema>;
export const defaultAppearance: BuildAppearance = {
  paint: {
    enabled: false,
    color: "#f4f4ef",
    finish: "gloss",
    factoryCode: null,
  },
  upholstery: { enabled: false, color: "#846754", finish: "fabric" },
  trim: { enabled: false, color: "#2b2a28" },
  wheels: {
    packageId: "reference",
    finishEnabled: false,
    color: "#aeb1b3",
    scale: 1,
    widthScale: 1,
  },
  rideHeight: 0,
  engineAccent: { enabled: false, color: "#a33225" },
  quality: "balanced",
};
const wheelFitment = z
  .object({
    diameterIn: z.number().min(10).max(24).nullable(),
    widthIn: z.number().min(3).max(15).nullable(),
    offsetMm: z.number().min(-100).max(100).nullable(),
    boltPattern: text(30),
    centerBoreMm: z.number().min(30).max(150).nullable(),
    brakeClearanceConfirmed: z.boolean(),
  })
  .strict();
export const componentSchema = z
  .object({
    id,
    system: z.enum(buildSystems),
    kind: z.enum(["oem", "aftermarket", "custom"]),
    partId: id.nullable(),
    number: z
      .string()
      .regex(/^\d{11}$/)
      .nullable(),
    name: text(160).min(1),
    manufacturer: text(100),
    productCode: text(100),
    quantity: z.number().int().min(1).max(1000),
    stage: workStageSchema,
    estimate: money,
    actual: money,
    publicCost: z.boolean(),
    privateNotes: text(4000),
    publicNotes: text(1000),
    guideIds: z.array(id).max(12),
    wheelFitment: wheelFitment.nullable(),
    fabrication: z.enum(["unknown", "required", "none-documented"]),
  })
  .strict()
  .superRefine((c, ctx) => {
    if (c.kind === "oem" && (!c.partId || !c.number))
      ctx.addIssue({
        code: "custom",
        message: "Select an existing BMW catalog identity.",
        path: ["partId"],
      });
    if (c.kind !== "oem" && (c.partId || c.number))
      ctx.addIssue({
        code: "custom",
        message: "Aftermarket and custom components use their own identities.",
        path: ["number"],
      });
    if (c.kind === "aftermarket" && !c.manufacturer.trim())
      ctx.addIssue({
        code: "custom",
        message: "Record the aftermarket manufacturer.",
        path: ["manufacturer"],
      });
  });
export const taskSchema = z
  .object({
    id,
    title: text(160).min(1),
    componentId: id.nullable(),
    system: z.enum(buildSystems),
    status: workStageSchema,
    dependencies: z.array(id).max(30),
    guideId: id.nullable(),
    dueOn: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .nullable(),
    completedOn: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .nullable(),
    notes: text(4000),
    public: z.boolean(),
    transferred: z.boolean(),
  })
  .strict();
export const buildStateSchema = z
  .object({
    schemaVersion: z.literal(1),
    title: text(120).min(1),
    description: text(5000),
    publicDescription: text(3000),
    style: z.enum(buildStyles),
    lifecycle: z.enum(["draft", "active", "completed", "archived"]),
    reference: z
      .object({
        id,
        revision: z.number().int().positive(),
        sha256: z.string().regex(/^[a-f0-9]{64}$/),
      })
      .strict(),
    baseConfiguration: vehicleSchema,
    targetConfiguration: vehicleSchema,
    appearance: appearanceSchema,
    components: z.array(componentSchema).max(150),
    tasks: z.array(taskSchema).max(300),
    milestones: z
      .array(
        z
          .object({
            id,
            title: text(160).min(1),
            date: z
              .string()
              .regex(/^\d{4}-\d{2}-\d{2}$/)
              .nullable(),
            notes: text(2000),
            public: z.boolean(),
          })
          .strict(),
      )
      .max(50),
    photoIds: z.array(z.string().uuid()).max(24),
    currency: z.enum(["USD", "EUR", "GBP", "CAD", "AUD"]),
    privateNotes: text(12000),
  })
  .strict()
  .superRefine((s, ctx) => {
    for (const [key, rows] of [
      ["components", s.components],
      ["tasks", s.tasks],
      ["milestones", s.milestones],
    ] as const)
      if (new Set(rows.map((r) => r.id)).size !== rows.length)
        ctx.addIssue({
          code: "custom",
          message: "Identifiers must be unique.",
          path: [key],
        });
    const tasks = new Map(s.tasks.map((t) => [t.id, t])),
      components = new Set(s.components.map((c) => c.id));
    for (const t of s.tasks) {
      if (
        (t.componentId && !components.has(t.componentId)) ||
        t.dependencies.some((d) => !tasks.has(d) || d === t.id)
      )
        ctx.addIssue({
          code: "custom",
          message: "Task relationships must reference this build.",
          path: ["tasks"],
        });
    }
    const done = new Set<string>(),
      visiting = new Set<string>();
    function visit(key: string) {
      if (visiting.has(key)) return false;
      if (done.has(key)) return true;
      visiting.add(key);
      for (const d of tasks.get(key)?.dependencies || [])
        if (!visit(d)) return false;
      visiting.delete(key);
      done.add(key);
      return true;
    }
    if (s.tasks.some((t) => !visit(t.id)))
      ctx.addIssue({
        code: "custom",
        message: "Task dependencies cannot contain a cycle.",
        path: ["tasks"],
      });
    if (new TextEncoder().encode(JSON.stringify(s)).length > 300000)
      ctx.addIssue({
        code: "custom",
        message: "This project exceeds the supported size.",
      });
  });
export type BuildState = z.infer<typeof buildStateSchema>;
export type BuildComponent = z.infer<typeof componentSchema>;
export type BuildTask = z.infer<typeof taskSchema>;
export type BuildProject = {
  id: string;
  user_id: string;
  vehicle_id: string | null;
  version: number;
  state: BuildState;
  updated_at: string;
  created_at: string;
};
export function newBuild(referenceId = defaultVehicleReferenceId): BuildState {
  const series = seriesForModel(referenceId), references = referencesForSeries(series);
  const r = references.find((r) => r.id === referenceId) || references[0];
  if (!r) throw Error("Choose an available car reference.");
  const base = { ...emptyVehicle, ...referenceVehicle(r) };
  return buildStateSchema.parse({
    schemaVersion: 1,
    title: "My " + series.toUpperCase() + " build",
    description: "",
    publicDescription: "",
    style: "street",
    lifecycle: "draft",
    reference: { id: r.id, revision: r.revision, sha256: r.sha256 },
    baseConfiguration: base,
    targetConfiguration: base,
    appearance: structuredClone(defaultAppearance),
    components: [],
    tasks: [],
    milestones: [],
    photoIds: [],
    currency: "USD",
    privateNotes: "",
  });
}
export function newComponent(
  system: BuildComponent["system"] = "engine",
): BuildComponent {
  return {
    id: buildId(),
    system,
    kind: "custom",
    partId: null,
    number: null,
    name: "Planned " + system,
    manufacturer: "",
    productCode: "",
    quantity: 1,
    stage: "planned",
    estimate: null,
    actual: null,
    publicCost: false,
    privateNotes: "",
    publicNotes: "",
    guideIds: [],
    wheelFitment: null,
    fabrication: "unknown",
  };
}
export function newTask(
  title: string,
  system: BuildTask["system"] = "accessories",
  componentId: string | null = null,
): BuildTask {
  return {
    id: buildId(),
    title,
    system,
    componentId,
    status: "planned",
    dependencies: [],
    guideId: null,
    dueOn: null,
    completedOn: null,
    notes: "",
    public: false,
    transferred: false,
  };
}
export function buildTotals(state: BuildState) {
  const total = (key: "estimate" | "actual") => ({
    known: state.components.reduce(
      (sum, c) => sum + (c[key] === null ? 0 : c[key] * c.quantity),
      0,
    ),
    unknown: state.components.filter((c) => c[key] === null).length,
  });
  return {
    estimate: total("estimate"),
    actual: total("actual"),
    tasksDone: state.tasks.filter((t) =>
      ["installed", "tested", "verified"].includes(t.status),
    ).length,
    tasksTotal: state.tasks.length,
  };
}
export function buildChangeSummary(before: BuildState, after: BuildState) {
  const changes: string[] = [];
  for (const key of [
    "title",
    "description",
    "publicDescription",
    "style",
    "lifecycle",
    "reference",
    "baseConfiguration",
    "targetConfiguration",
    "appearance",
    "components",
    "tasks",
    "milestones",
    "photoIds",
    "currency",
    "privateNotes",
  ] as const)
    if (JSON.stringify(before[key]) !== JSON.stringify(after[key]))
      changes.push(
        key === "privateNotes"
          ? "private notes"
          : key.replace(/[A-Z]/g, (m) => " " + m.toLowerCase()),
      );
  return changes.join(", ").slice(0, 500) || "No content changes";
}

/** Object field order changes through JSONB/validation; array order and every value still matter. */
export function buildStateKey(state: BuildState | null): string {
  function ordered(value: unknown): unknown {
    if (Array.isArray(value)) return value.map(ordered);
    if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map(key => [key, ordered((value as Record<string, unknown>)[key])]));
    return value;
  }
  return JSON.stringify(ordered(state));
}
