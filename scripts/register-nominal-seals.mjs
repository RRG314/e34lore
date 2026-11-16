import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";
const cfg = JSON.parse(
  fs.readFileSync(new URL("../src/data/backend.json", import.meta.url), "utf8"),
);
const db = createClient(cfg.url, cfg.publishableKey, {
    auth: { persistSession: false },
  }),
  rows = [];
for (let from = 0; ; from += 1000) {
  const r = await db
    .from("part_assembly_positions")
    .select(
      "id,part_id,source_name,source_url,record_sha256,conditions,parts(number_normalized)",
    )
    .eq("active", true)
    .in("source_name", ["O-ring", "O-Ring", "O-ring seal"])
    .order("id")
    .range(from, from + 999);
  if (r.error) throw r.error;
  rows.push(...r.data);
  if (r.data.length < 1000) break;
}
const groups = new Map();
for (const row of rows) {
  for (const condition of row.conditions) {
    if (condition.name !== "Extra Info") continue;
    const match = /^(\d+(?:[.,]\d+)?)x(\d+(?:[.,]\d+)?)$/i.exec(
      condition.value.trim(),
    );
    if (!match) continue;
    const dimensions = match.slice(1).map((x) => Number(x.replace(",", ".")));
    if (
      dimensions.some((x) => !Number.isFinite(x) || x <= 0) ||
      dimensions[0] < dimensions[1] ||
      dimensions[0] > 1000 ||
      dimensions[1] > 30
    )
      continue;
    const list = groups.get(row.part_id) || [];
    list.push({
      positionId: row.id,
      sourceUrl: row.source_url,
      recordSha256: row.record_sha256,
      number: row.parts.number_normalized,
      expression: condition.value,
      dimensions,
    });
    groups.set(row.part_id, list);
  }
}
const seals = [],
  rejected = [];
for (const [partId, evidence] of groups) {
  const alternatives = new Set(
    evidence.map((e) => JSON.stringify(e.dimensions)),
  );
  if (alternatives.size !== 1) {
    rejected.push({
      partId,
      reason: "Conflicting source dimensions",
      evidence,
    });
    continue;
  }
  const [insideDiameterMm, crossSectionMm] = evidence[0].dimensions;
  seals.push({
    partId,
    number: evidence[0].number,
    name: "O-ring " + evidence[0].expression,
    insideDiameterMm,
    crossSectionMm,
    outerDiameterMm: insideDiameterMm + 2 * crossSectionMm,
    geometryId: "nominal-seal:" + partId,
    interpretation:
      "Catalog A×B interpreted as nominal inside diameter × circular cross-section. This interpretation needs technical review for each BMW application.",
    dimensionConventionSource:
      "https://www.trelleborg.com/seals/-/media/tss-media-repository/tss_website/pdf-and-other-literature/catalogs/o_ring_gb_en.pdf",
    accuracy: {
      visual: "illustrative",
      dimensions: "illustrative",
      alignment: "missing",
      mechanical: "missing",
      removal: "missing",
    },
    evidence,
  });
}
seals.sort((a, b) => a.number.localeCompare(b.number));
fs.mkdirSync("data/digital-twin", { recursive: true });
fs.writeFileSync(
  "data/digital-twin/nominal-seals.json",
  JSON.stringify(
    {
      schemaVersion: 1,
      method:
        "Original parametric nominal circular seals; no manufacturer tolerances, material specification, installed deformation or fitment is inferred.",
      seals,
      rejected,
    },
    null,
    2,
  ) + "\n",
);
console.log(
  seals.length +
    " nominal seals registered; " +
    rejected.length +
    " conflicting identities excluded.",
);
