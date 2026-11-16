import { z } from "zod";
import { cosine, models } from "./contracts";
import { componentFamilies,photoNegativeFamilies } from "./families";
import { compareFamilies, familyVectorsSchema, type FamilyComparison } from "./family-comparison";

const vector = z.array(z.number().finite()).length(512).refine(v => Math.abs(Math.hypot(...v) - 1) < .001);
export const licensedFamilyIndexSchema = z.object({
  schema: z.literal(1), version: z.literal("licensed-family-v1"),
  preprocessing: z.literal("contain-edge-median-384-v1"),
  model: z.object({ id: z.literal(models.embedding.id), revision: z.literal(models.embedding.revision), dtype: z.literal("q8") }),
  text: familyVectorsSchema,
  records: z.array(z.object({ id: z.string(), family: z.string(), negative: z.boolean(), sourceSha256: z.string().regex(/^[a-f0-9]{64}$/), source: z.url(), license: z.enum(["CC BY-SA 3.0", "CC BY-SA 4.0", "CC BY 2.0", "CC BY 3.0", "CC BY 4.0", "CC0 1.0", "Public domain"]), objectGroup: z.string(), embedding: vector })).min(2).max(200),
}).superRefine((index, context) => {
  if (new Set(index.records.map(r => r.id)).size !== index.records.length || new Set(index.records.map(r => r.sourceSha256)).size !== index.records.length)
    context.addIssue({ code: "custom", message: "Duplicate reference image" });
  if (index.records.some(r => r.negative ? !photoNegativeFamilies.some(f=>f.id===r.family) : !componentFamilies.some(f => f.id === r.family && !f.negative)))
    context.addIssue({ code: "custom", message: "Unsupported component category" });
});

/** Frozen engineering cutoffs. A category lead needs both text and a licensed
 * photo in every view. No visual result can confirm a BMW ordering number. */
export function compareLicensedFamilies(images: number[][], source: unknown): FamilyComparison {
  const index = licensedFamilyIndexSchema.parse(source), baseline = compareFamilies(images, index.text);
  const text = images.map(image => index.text.records.map(row => ({ id: row.id, score: cosine(image, row.embedding) })).sort((a, b) => b.score - a.score));
  const evidence = images.map(image => {
    const ranked = index.records.map(reference => ({ reference, score: cosine(image, reference.embedding) })).sort((a, b) => b.score - a.score);
    const first = ranked[0], rival = ranked.find(row => row.reference.family !== first.reference.family);
    return { familyId: first.reference.family, negative: first.reference.negative, similarity: first.score, margin: first.score - (rival?.score ?? first.score), referenceIds: [first.reference.id] };
  });
  const family = evidence[0].familyId;
  const strongEvidence=evidence.filter(row=>row.similarity>=.80&&row.margin>=.035);
  const negativeLead=strongEvidence.some(row=>row.negative);
  const mixedParts=new Set(strongEvidence.map(row=>row.familyId)).size>1;
  const corroborated = evidence.every(row => !row.negative && row.familyId === family && row.similarity >= .80 && row.margin >= .035)
    && text.every(rows => !componentFamilies.find(f => f.id === rows[0].id)?.negative && rows.slice(0, 3).some(row => row.id === family && row.score >= .20));
  const candidates: FamilyComparison["candidates"] = [];
  if (corroborated) {
    const viewScores = text.map(rows => rows.find(row => row.id === family)!.score);
    candidates.push({ id: family, viewScores, score: viewScores.reduce((a, b) => a + b, 0) / images.length, votes: text.filter(rows => rows[0].id === family).length });
  }
  return { ...baseline, candidates, accepted: false, status: corroborated ? "review" : "inconclusive", recognizer: "licensed-family-v1", photoEvidence: evidence.map(({familyId,similarity,margin,referenceIds})=>({familyId,similarity,margin,referenceIds})),
    reason: corroborated ? "Check the shape, mounting points and markings before choosing a part number."
      : mixedParts ? "These photos point to different parts. Keep only views of the same part and scan again."
      : negativeLead ? "Try a clear photo of the whole part, including its mounting points. You can also look up a part number."
        : "Try another angle of the same part or search by name or part number.",
    nextView: mixedParts ? "Review the photos above and remove any that show a different part. Keep a front and side view of the same item." : "Show the other side and its mounting points or connector. Keep all remaining pieces of a broken part in view." };
}
