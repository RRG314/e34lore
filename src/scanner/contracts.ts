import { z } from "zod";
export const scanModes = ["installed", "loose", "markings", "vin"] as const;
export type ScanMode = (typeof scanModes)[number];
export const boxSchema = z
  .object({
    xmin: z.number().min(0).max(1),
    ymin: z.number().min(0).max(1),
    xmax: z.number().min(0).max(1),
    ymax: z.number().min(0).max(1),
  })
  .refine((b) => b.xmax > b.xmin && b.ymax > b.ymin);
export type Box = z.infer<typeof boxSchema>;
export type Detection = { label: string; score: number; box: Box };
export type VisualCandidate = {
  nodeId: string;
  name: string;
  score: number;
  thumbnail: string;
  source: "synthetic-reference" | "licensed-photo";
};
export const models = {
  detector: {
    id: "Xenova/owlvit-base-patch32",
    revision: "b75f4e52949639c3bb0b96546ea4149482f6e7ef",
    bytes: 155431700,
    license: "Apache-2.0",
  },
  embedding: {
    id: "Xenova/clip-vit-base-patch32",
    revision: "6b7c523703ae26e39be4b03774966f8571c7f523",
    bytes: 89117001,
    license: "MIT",
  },
} as const;
export const componentPrompts = [
  "a car water pump",
  "a car alternator",
  "a car starter motor",
  "a car brake caliper",
  "a car radiator",
  "a car thermostat housing",
  "a car belt pulley",
  "a car oil filter",
  "a car suspension control arm",
  "a car shock absorber",
  "a car battery",
  "a car fuse box",
  "a car wheel",
  "a car headlight",
  "a car steering wheel",
  "a car fuel injector",
  "a car engine cover",
  "a car air filter housing",
];
/** Exact complete markings only. No substitutions or inferred missing digits. */
export function partMarkings(text: string) {
  const re =
    /(?<![A-Z0-9])(?:\d{11}|(?:\d{4}|\d{2}[\s.\-]+\d{2})[\s.\-]+(?:\d{7}|(?:\d{4}|\d[\s.\-]+\d{3})[\s.\-]+\d{3}))(?![A-Z0-9])/gi;
  return [
    ...new Set((text.match(re) || []).map((s) => s.replace(/\D/g, "")).filter(n=>n!=='00000000000')),
  ].slice(0, 12);
}
export function cosine(a: number[], b: number[]) {
  if (a.length !== b.length || !a.length) return -1;
  let dot = 0,
    aa = 0,
    bb = 0;
  for (let i = 0; i < a.length; i++) {
    if (!Number.isFinite(a[i]) || !Number.isFinite(b[i])) return -1;
    dot += a[i] * b[i];
    aa += a[i] * a[i];
    bb += b[i] * b[i];
  }
  return aa && bb ? dot / Math.sqrt(aa * bb) : -1;
}
export function rankReferences(
  vector: number[],
  refs: {
    nodeId: string;
    name: string;
    thumbnail: string;
    embedding: number[];
    synthetic?: boolean;
  }[],
): VisualCandidate[] {
  return refs
    .map((r) => ({
      nodeId: r.nodeId,
      name: r.name,
      thumbnail: r.thumbnail,
      score: cosine(vector, r.embedding),
      source:
        r.synthetic === false
          ? ("licensed-photo" as const)
          : ("synthetic-reference" as const),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}
export function visualDecision(
  candidates: VisualCandidate[],
  calibrated = false,
) {
  if (!calibrated)
    return {
      accepted: false,
      message:
        "Unable to identify confidently. These are unverified visual comparisons, not identified OEM parts.",
    };
  return {
    accepted: false,
    message:
      "Exact OEM identification needs a readable marking or independent evidence.",
  };
}

export const referenceIndexSchema = z.object({
  schema: z.literal(1),
  records: z
    .array(
      z.object({
        id: z.string().max(160),
        nodeId: z.string().max(240),
        name: z.string().max(300),
        thumbnail: z
          .string()
          .regex(
            /^\/(?:models\/e34-lore\/r\d+\/[a-f0-9]{64}\.png|scanner\/references\/[a-zA-Z0-9_.-]+\.jpg)$/,
          ),
        synthetic: z.boolean(),
        embedding: z.array(z.number().finite()).length(512),
        provenance: z.record(z.string(), z.unknown()),
      }),
    )
    .max(500),
});

/** Clip the detector's floating-point overhang to the actual image, without changing its label or score. */
export function normalizeDetection(d: Detection): Detection | null {
  const clip = (n: number) => Math.min(1, Math.max(0, n));
  const box = {
    xmin: clip(d.box.xmin),
    ymin: clip(d.box.ymin),
    xmax: clip(d.box.xmax),
    ymax: clip(d.box.ymax),
  };
  return boxSchema.safeParse(box).success &&
    Number.isFinite(d.score) &&
    d.score >= 0 &&
    d.score <= 1
    ? { ...d, box }
    : null;
}
