import fs from "node:fs";
import { buildAssembly } from "../src/graphics/assembly-geometry.ts";
import { parts } from "../src/data/catalog.ts";
const assemblies = [
  "water-pump",
  "front-strut",
  "front-strut-damper",
  "front-brake",
  "front-brake-disc",
];
const models = assemblies.map((assembly) => {
  const built = buildAssembly(assembly);
  const ids = [...new Set(built.parts.flatMap((p) => p.ids))].filter((id) =>
    parts.some((p) => p.id === id),
  );
  built.group.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    if (o.material)
      (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) =>
        m.dispose(),
      );
  });
  return {
    id: "reference:" + assembly,
    assembly,
    partIds: ids,
    accuracy: {
      visual: "illustrative",
      dimensions: "missing",
      alignment: "missing",
      mechanical: "missing",
      removal: "missing",
    },
    scope:
      "Original relationship geometry; not dimensionally verified BMW CAD.",
  };
});
fs.writeFileSync(
  "src/digital-twin/reference-models.json",
  JSON.stringify({ schemaVersion: 1, models }, null, 2) + "\n",
);
console.log(
  models.length +
    " assembly references; " +
    new Set(models.flatMap((m) => m.partIds)).size +
    " represented component identities.",
);
