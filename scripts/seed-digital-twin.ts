import fs from "node:fs";
import { createHash } from "node:crypto";
import { nominalSeals } from "../src/digital-twin/model-registry";
import { initialTwinGraph as graph } from "../src/digital-twin/reference-configuration";
import { validateGraph } from "../src/digital-twin/graph";
const errors = validateGraph(graph);
if (errors.length) throw Error(errors.join(";"));
const quote = (x: unknown) =>
  x === null
    ? "null"
    : "'" +
      String(typeof x === "object" ? JSON.stringify(x) : x).replaceAll(
        "'",
        "''",
      ) +
      "'";
const inserts: string[] = [];
function insert(table: string, rows: Record<string, unknown>[]) {
  for (const r of rows)
    inserts.push(
      `insert into public.${table}(${Object.keys(r).join(",")}) select ${Object.values(r).map(quote).join(",")} where not exists(select 1 from public.${table} where id=${quote(r.id)}${table === "assembly_nodes" ? " and configuration_revision_id=" + quote(r.configuration_revision_id) : ""}) on conflict do nothing;`,
    );
}
insert("asset_licenses", [
  {
    id: "cc-by-4.0",
    name: "Creative Commons Attribution 4.0",
    url: "https://creativecommons.org/licenses/by/4.0/",
    redistribution: "allowed",
    attribution:
      "Uralvagonzavod (UVZZZ / Silbergrau); adapted exterior and wheel; changes documented in /models/e34-525i/LICENSE.md",
  },
  {
    id: "project-original",
    name: "Project original reference geometry",
    url: null,
    redistribution: "allowed",
    attribution:
      "E34 Collective; original procedural relationship illustrations; not BMW factory CAD",
  },
]);
insert("asset_sources", [
  {
    id: "twin-exterior-source",
    license_id: "cc-by-4.0",
    url: "https://sketchfab.com/3d-models/bmw-525i-e34-project-zomboid-c65aa3b7687d4f5dbbabdfad0b7816bb",
    author: "Uralvagonzavod (UVZZZ / Silbergrau)",
    identity: "E34 exterior game reference; unverified internal geometry",
  },
  {
    id: "twin-project-reference-geometry",
    license_id: "project-original",
    url: null,
    author: "E34 Collective",
    identity:
      "Original procedural relationship geometry; scale, installation and physical paths unverified",
  },
]);
insert("digital_twin_vehicles", [
  {
    id: "e34-525i-reference",
    model_id: "525i",
    name: "E34 525i reference configuration",
    source_id: "bentley-e34-upload",
  },
]);
insert("digital_twin_configurations", [
  {
    id: graph.configuration.id,
    vehicle_id: "e34-525i-reference",
    name: "1995 525i M50-family reference",
    reference_year: 1995,
    engine_family: "M50",
    body: "Sedan",
    notes: graph.configuration.notes,
  },
]);
// Register nominal dependencies before their assets, including on an empty database.
for (const seal of nominalSeals.filter((seal) =>
  graph.geometry.some((g) => g.id === seal.geometryId + ":r1"),
)) {
  insert("asset_sources", [
    {
      id: "nominal-seal-source:" + seal.partId,
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
    },
  ]);
}
for (const g of graph.geometry) {
  const nominal = nominalSeals.find((seal) => g.id === seal.geometryId + ":r1");
  const runtime = g.runtimePath
    ? fs.readFileSync("public" + g.runtimePath)
    : null;
  insert("three_d_assets", [
    {
      id: g.assetId,
      source_id: g.sourceIds[0],
      name: g.assetId,
      kind: nominal ? "nominal-cad" : "visual-reference",
      publication_status: "draft",
      notes: g.knownGaps.join(" "),
    },
  ]);
  insert("geometry_revisions", [
    {
      id: g.id,
      asset_id: g.assetId,
      revision: g.revision,
      format: g.format,
      runtime_path: g.runtimePath,
      source_units: g.sourceUnits,
      meters_per_unit: g.metersPerUnit,
      source_sha256: runtime
        ? createHash("sha256").update(runtime).digest("hex")
        : null,
      statistics: {
        bytes: runtime?.length ?? null,
        triangles: g.triangles,
        ...(nominal
          ? {
              nominalInsideDiameterMm: nominal.insideDiameterMm,
              nominalCrossSectionMm: nominal.crossSectionMm,
              nominalOuterDiameterMm: nominal.outerDiameterMm,
            }
          : {}),
      },
      accuracy: g.accuracy,
      known_gaps: g.knownGaps,
    },
  ]);
  inserts.push(
    `update public.three_d_assets set publication_status='published' where id=${quote(g.assetId)};`,
  );
}
const revisionId = graph.id + ":" + graph.revision;
inserts.push(
  `do $twin$ begin if exists(select 1 from public.digital_twin_configuration_revisions where id=${quote(revisionId)} and graph<>${quote(graph)}::jsonb) then raise exception 'Graph changed without a new revision'; end if; end; $twin$;`,
);
insert("digital_twin_configuration_revisions", [
  {
    id: revisionId,
    configuration_id: graph.configuration.id,
    revision: graph.revision,
    graph_id: graph.id,
    graph,
    publication_status: "draft",
  },
]);
// Parents precede children in the manifest; the composite parent FK is also deferred.
insert(
  "assembly_nodes",
  graph.nodes.map((n) => ({
    configuration_revision_id: revisionId,
    id: n.id,
    parent_id: n.parentId,
    name: n.name,
    part_id: n.partId,
    geometry_revision_id: n.geometryRevisionId,
    transform: n.transform,
    accuracy: n.accuracy,
    source_ids: "{" + n.sourceIds.join(",") + "}",
    guide_ids: "{" + n.guideIds.join(",") + "}",
    missing_evidence: n.missingEvidence,
  })),
);
insert(
  "disassembly_dependencies",
  graph.dependencies.map((d) => ({
    id: revisionId + ":" + d.id,
    configuration_revision_id: revisionId,
    target_node: d.target,
    prerequisite_node: d.prerequisite,
    reason: d.reason,
    evidence: d.evidence,
    review_state: d.reviewState,
  })),
);
insert(
  "repair_scene_steps",
  graph.repairSteps.map((s, i) => ({
    id: revisionId + ":" + s.id,
    configuration_revision_id: revisionId,
    guide_id: s.guideId,
    source_id: "bentley-e34-upload",
    title: s.title,
    node_ids: "{" + s.nodeIds.join(",") + "}",
    required_removed: "{" + s.requiredRemoved.join(",") + "}",
    step_index: i,
    evidence: s.evidence,
    review_state: s.reviewState,
  })),
);
inserts.push(
  `update public.digital_twin_configuration_revisions set publication_status='published' where id=${quote(revisionId)};`,
);
fs.writeFileSync(
  "database/digital-twin-seed.sql",
  "begin;\n" + inserts.join("\n") + "\ncommit;\n",
);
console.log(
  `${graph.nodes.length} nodes; ${graph.geometry.length} geometry references; ${graph.dependencies.length} source dependencies; ${graph.repairSteps.length} planning steps.`,
);

// A rollback-only FK test uses entirely new identities, so existing sources cannot mask ordering bugs.
const ids = new Set([
  "cc-by-4.0",
  "project-original",
  ...graph.geometry.flatMap((g) => [g.id, g.assetId, ...g.sourceIds]),
]);
let fixture = inserts
  .filter((sql) =>
    /^insert into public\.(asset_licenses|asset_sources|three_d_assets|geometry_revisions)\(/.test(
      sql,
    ),
  )
  .join("\n");
for (const id of [...ids].sort((a, b) => b.length - a.length))
  fixture = fixture.replaceAll(quote(id), quote("qa-seed-check:" + id));
fs.writeFileSync(
  "tests/digital-twin-seed-transaction.sql",
  "begin;\n" +
    fixture +
    "\ndo $$begin if (select count(*) from public.geometry_revisions where id like 'qa-seed-check:%')<>" +
    graph.geometry.length +
    " then raise exception 'Fresh source/asset/geometry seed failed'; end if; end;$$;\nrollback;\n",
);
