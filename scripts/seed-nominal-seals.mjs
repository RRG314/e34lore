import fs from "node:fs";
const manifest = JSON.parse(
    fs.readFileSync("data/digital-twin/nominal-seals.json", "utf8"),
  ),
  build = JSON.parse(
    fs.readFileSync("data/digital-twin/nominal-seal-build.json", "utf8"),
  );
const q = (x) =>
  x === null
    ? "null"
    : "'" +
      String(typeof x === "object" ? JSON.stringify(x) : x).replaceAll(
        "'",
        "''",
      ) +
      "'";
const sql = ["begin;"];
const insert = (table, row) =>
  sql.push(
    `insert into public.${table}(${Object.keys(row).join(",")}) values(${Object.values(row).map(q).join(",")}) on conflict do nothing;`,
  );
for (const seal of manifest.seals) {
  const sourceId = "nominal-seal-source:" + seal.partId,
    assetId = "nominal-seal-asset:" + seal.partId,
    geometryId = seal.geometryId + ":r1",
    runtime = build.assets
      .find((x) => x.partId === seal.partId)
      .files.find((f) => f.level === "medium");
  insert("asset_sources", {
    id: sourceId,
    license_id: "project-original",
    url: seal.evidence[0].sourceUrl,
    author:
      "E34 Collective original parametric geometry; catalog factual dimensions attributed to source",
    identity: seal.name + " / " + seal.number,
    evidence: {
      interpretation: seal.interpretation,
      dimensionConventionSource: seal.dimensionConventionSource,
      sourcePositions: seal.evidence,
    },
  });
  insert("three_d_assets", {
    id: assetId,
    source_id: sourceId,
    name: seal.name,
    kind: "nominal-cad",
    publication_status: "draft",
    notes: manifest.method,
  });
  insert("geometry_revisions", {
    id: geometryId,
    asset_id: assetId,
    revision: 1,
    format: "glb",
    runtime_path: "/" + runtime.path.replace(/^public\//, ""),
    source_units: "m",
    meters_per_unit: 1,
    source_sha256: runtime.sha256,
    accuracy: seal.accuracy,
    statistics: {
      triangles: runtime.triangles,
      bytes: runtime.bytes,
      nominalInsideDiameterMm: seal.insideDiameterMm,
      nominalCrossSectionMm: seal.crossSectionMm,
      nominalOuterDiameterMm: seal.outerDiameterMm,
    },
    known_gaps: [
      "Catalog dimension interpretation requires technical review",
      "No manufacturer tolerances or material specification",
      "No installed deformation, groove geometry or fitment approval",
    ],
  });
  insert("component_meshes", {
    id: geometryId + ":mesh",
    geometry_revision_id: geometryId,
    part_id: seal.partId,
    mesh_name: "part:" + seal.partId,
    local_transform: {
      translation: [0, 0, 0],
      rotation: [0, 0, 0, 1],
      scale: [1, 1, 1],
    },
    association_status: "illustrative",
    evidence: seal.evidence,
  });
  sql.push(
    `update public.three_d_assets set publication_status='published' where id=${q(assetId)};`,
  );
}
sql.push("commit;");
fs.writeFileSync("database/nominal-seals-seed.sql", sql.join("\n") + "\n");
console.log(
  manifest.seals.length +
    " nominal component source/asset/geometry/canonical associations.",
);
