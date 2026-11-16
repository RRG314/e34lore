import fs from "node:fs";
import { buildAssembly } from "../src/graphics/assembly-geometry";
import { parts } from "../src/data/catalog";
import { referenceModels } from "../src/digital-twin/model-registry";
import { disposeObject } from "../src/graphics/dispose";
const q = (x: unknown) =>
  "'" +
  String(typeof x === "object" ? JSON.stringify(x) : x).replaceAll("'", "''") +
  "'";
const rows: string[] = [];
for (const model of referenceModels) {
  const built = buildAssembly(model.assembly);
  for (const mesh of built.parts)
    for (const partId of mesh.ids.filter((id) =>
      parts.some((p) => p.id === id),
    )) {
      const id = model.assembly + "-reference-r1:" + partId;
      rows.push(
        `insert into public.component_meshes(id,geometry_revision_id,part_id,mesh_name,local_transform,association_status,evidence) values(${q(id)},${q(model.assembly + "-reference-r1")},${q(partId)},${q(mesh.object.name)},${q({ translation: mesh.base.toArray(), rotation: [0, 0, 0, 1], scale: [1, 1, 1] })},'illustrative',${q([{ method: "Original procedural relationship illustration; alternate catalog identities can share an approximate shape", sourceId: "twin-project-reference-geometry" }])}) on conflict do nothing;`,
      );
    }
  disposeObject(built.group);
}
fs.writeFileSync(
  "database/reference-meshes-seed.sql",
  "begin;\n" + rows.join("\n") + "\ncommit;\n",
);
console.log(
  rows.length + " explicit canonical-to-reference geometry associations.",
);
