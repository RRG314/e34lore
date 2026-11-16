import fs from "node:fs";
import { initialTwinGraph as graph } from "../src/digital-twin/reference-configuration";
import {
  referenceModels,
  nominalSeals,
  referenceModelForPart,
} from "../src/digital-twin/model-registry";
import { validateGraph } from "../src/digital-twin/graph";
const errors = validateGraph(graph);
if (errors.length) throw Error(errors.join("; "));
const report = {
  schemaVersion: 1,
  configurationId: graph.configuration.id,
  graphRevision: graph.revision,
  primaryAreas: graph.nodes.filter((n) => n.parentId === "vehicle").length,
  structuralAndComponentRecords: graph.nodes.length,
  recordsLinkedToVisualReferences: graph.nodes.filter(
    (n) =>
      n.geometryRevisionId || (n.partId && referenceModelForPart(n.partId)),
  ).length,
  originalRelationshipAssemblies: referenceModels.length,
  referenceComponentIdentities: new Set(
    referenceModels.flatMap((m) => m.partIds),
  ).size,
  nominalCircularSealIdentities: nominalSeals.length,
  uniqueCanonicalIdentitiesWithReferenceOrNominalModels: new Set([
    ...referenceModels.flatMap((m) => m.partIds),
    ...nominalSeals.map((s) => s.partId),
  ]).size,
  dimensionallyVerifiedComponents: graph.nodes.filter(
    (n) => n.accuracy.dimensions === "verified",
  ).length,
  documentedAccessDependencies: graph.dependencies.length,
  verifiedPhysicalRemovalPaths: graph.removalPaths.filter(
    (p) => p.kind === "documented" && p.reviewState === "verified",
  ).length,
  sourceLinkedPlanningSteps: graph.repairSteps.length,
  missingGeometry: graph.nodes
    .filter(
      (n) =>
        !n.geometryRevisionId && !(n.partId && referenceModelForPart(n.partId)),
    )
    .map((n) => ({
      id: n.id,
      name: n.name,
      requiredEvidence: n.missingEvidence,
    })),
  limits: [
    "Structural records are not a complete bill of materials.",
    "Shared reference geometry does not prove variant equivalence.",
    "Nominal seals are catalog-dimension interpretations, not manufacturer-verified parts.",
    "No verified internal M50 engine or installed engine-bay geometry is present.",
  ],
};
fs.writeFileSync(
  "data/digital-twin/coverage.json",
  JSON.stringify(report, null, 2) + "\n",
);
console.log(
  JSON.stringify({ ...report, missingGeometry: report.missingGeometry.length }),
);
