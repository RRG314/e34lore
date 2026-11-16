import { referenceModels, nominalSealForPart } from "./model-registry";
import { parts } from "../data/catalog";
import {
  identityTransform,
  missingAccuracy,
  type TwinGraph,
  type AssemblyNode,
  type GeometryRevision,
} from "./types";
const configurationId = "e34-525i-1995-m50-reference";
const areas = [
  ["body-shell", "Body shell"],
  ["exterior", "Exterior panels"],
  ["interior", "Interior"],
  ["engine", "Engine"],
  ["engine-accessories", "Engine accessories"],
  ["cooling", "Cooling system"],
  ["intake-exhaust", "Intake and exhaust"],
  ["transmission", "Transmission"],
  ["driveshaft", "Driveshaft"],
  ["differential", "Differential"],
  ["front-suspension", "Front suspension"],
  ["rear-suspension", "Rear suspension"],
  ["steering", "Steering"],
  ["brakes", "Brakes"],
  ["wheels", "Wheels"],
  ["fuel", "Fuel system"],
  ["electrical", "Electrical systems"],
  ["hvac", "Heating and air conditioning"],
  ["lighting", "Lighting"],
] as const;
function node(
  id: string,
  name: string,
  parentId: string | null,
  partId: string | null = null,
): AssemblyNode {
  return {
    id,
    name,
    parentId,
    partId,
    catalogAssemblyId: null,
    geometryRevisionId: null,
    transform: identityTransform(),
    configurationIds: [configurationId],
    sourceIds: [],
    guideIds: [],
    accuracy: missingAccuracy(),
    missingEvidence: [
      "Segmented source geometry",
      "Configuration-specific dimensional and mounting evidence",
    ],
  };
}
const nodes: AssemblyNode[] = [
  node("vehicle", "1995 E34 525i reference", null),
  ...areas.map(([id, name]) => node(id, name, "vehicle")),
];
const geometry: GeometryRevision[] = [
  {
    id: "e34-exterior-reference-r1",
    assetId: "e34-exterior-reference",
    revision: 1,
    format: "glb",
    runtimePath: "/models/e34-525i/e34-body.glb",
    sourceUnits: "unknown",
    metersPerUnit: null,
    accuracy: { ...missingAccuracy(), visual: "illustrative" },
    triangles: null,
    bytes: null,
    sourceIds: ["twin-exterior-source"],
    knownGaps: [
      "Artist/game exterior reference; internal parts are not segmented or dimensionally verified.",
    ],
  },
  {
    id: "e34-wheel-reference-r1",
    assetId: "e34-wheel-reference",
    revision: 1,
    format: "glb",
    runtimePath: "/models/e34-525i/e34-wheel.glb",
    sourceUnits: "unknown",
    metersPerUnit: null,
    accuracy: { ...missingAccuracy(), visual: "illustrative" },
    triangles: null,
    bytes: null,
    sourceIds: ["twin-exterior-source"],
    knownGaps: [
      "Wheel design, dimensions and installed applicability require review.",
    ],
  },
];
nodes.find((n) => n.id === "body-shell")!.geometryRevisionId =
  "e34-exterior-reference-r1";
nodes.find((n) => n.id === "body-shell")!.accuracy.visual = "illustrative";
for (const [id, name, key, parent] of [
  ["pump-reference", "Pump and thermostat reference", "water-pump", "cooling"],
  [
    "strut-reference",
    "Front strut reference",
    "front-strut",
    "front-suspension",
  ],
  [
    "damper-reference",
    "Damper and housing reference",
    "front-strut-damper",
    "front-suspension",
  ],
  ["strut-upper-reference", "Upper strut mounting reference", "front-strut-upper", "front-suspension"],
  ["caliper-reference", "Front caliper reference", "front-brake", "brakes"],
  ["disc-reference", "Disc and shield reference", "front-brake-disc", "brakes"],
] as const) {
  const n = node(id, name, parent);
  n.geometryRevisionId = key + "-reference-r1";
  n.accuracy.visual = "illustrative";
  nodes.push(n);
  geometry.push({
    id: n.geometryRevisionId,
    assetId: "reference:" + key,
    revision: 1,
    format: "procedural",
    runtimePath: null,
    sourceUnits: "unknown",
    metersPerUnit: null,
    accuracy: { ...missingAccuracy(), visual: "illustrative" },
    triangles: null,
    bytes: null,
    sourceIds: ["twin-project-reference-geometry"],
    knownGaps: [
      "Original relationship illustration, not verified BMW dimensions or installed alignment.",
    ],
  });
}
for (const [id, name, partId] of [
  ["pump", "Coolant pump", "coolant-pump"],
  ["pump-seal", "Pump O-ring", "pump-seal"],
  ["pump-retaining-nuts", "Pump retaining nuts", "pump-nut"],
  ["thermostat", "Thermostat", "thermostat"],
  ["thermostat-housing", "Thermostat housing", "thermostat-housing"],
  ["thermostat-seal", "Thermostat O-ring", "thermostat-seal"],
] as const) {
  const n = node(id, name, "pump-reference", partId);
  n.accuracy.visual = "illustrative";
  n.sourceIds = ["bentley-e34-upload"];
  n.guideIds = ["cooling-system-visual-check"];
  nodes.push(n);
}
for (const [id, name] of [
  ["fan-clutch", "Mechanical fan and clutch"],
  ["fan-shroud", "Fan shroud"],
  ["drive-belt", "Accessory drive belt"],
  ["pump-pulley", "Coolant-pump pulley"],
] as const) {
  const n = node(id, name, "cooling");
  n.sourceIds = ["bentley-e34-upload"];
  nodes.push(n);
}
// Complete structural slots are explicit missing-geometry records, not substitute meshes.
for (const [id, name, parent] of [
  ["engine-block", "Cylinder block and crankcase", "engine"],
  ["cylinder-head", "Cylinder head and cover", "engine"],
  ["crankshaft", "Crankshaft, bearings and flywheel", "engine"],
  ["pistons", "Pistons, pins and connecting rods", "engine"],
  ["valvetrain", "Camshafts, valves and valve springs", "engine"],
  ["timing", "Timing chains, guides and tensioners", "engine"],
  ["vanos", "VANOS (variant confirmation required)", "engine"],
  ["lubrication", "Oil pump, pickup, sump and filter housing", "engine"],
  ["alternator", "Alternator and mounts", "engine-accessories"],
  ["starter", "Starter and power connections", "engine-accessories"],
  ["belt-drive", "Belt drive and tensioners", "engine-accessories"],
  ["radiator", "Radiator, expansion tank and hoses", "cooling"],
  ["intake", "Air filter, meter, throttle and manifold", "intake-exhaust"],
  ["exhaust", "Manifolds, catalysts, silencers and hangers", "intake-exhaust"],
  [
    "clutch",
    "Clutch or torque converter (configuration dependent)",
    "transmission",
  ],
  ["shift-linkage", "Shift mechanism and mounts", "transmission"],
  ["front-arms", "Front control arms and joints", "front-suspension"],
  ["rear-arms", "Rear arms, bushings and subframe", "rear-suspension"],
  ["rear-dampers", "Rear dampers and springs", "rear-suspension"],
  ["steering-box", "Steering box, linkage and column", "steering"],
  ["brake-hydraulics", "Master cylinder, booster, pipes and ABS", "brakes"],
  ["rear-brakes", "Rear service and parking brakes", "brakes"],
  ["fuel-delivery", "Tank, pumps, lines, rail and injectors", "fuel"],
  ["engine-management", "Engine harness, sensors and DME", "electrical"],
  ["power-distribution", "Battery, grounds, fuses and relays", "electrical"],
  ["heater", "Heater core, valves and blower", "hvac"],
  ["air-conditioning", "Compressor, condenser and refrigerant circuit", "hvac"],
  ["seats-trim", "Seats, belts and interior trim", "interior"],
  ["glazing", "Glass, seals, doors and regulators", "exterior"],
])
  nodes.push(node(id, name, parent));
for (const model of referenceModels) {
  const parent = nodes.find(
    (n) => n.geometryRevisionId === model.assembly + "-reference-r1",
  )!;
  for (const partId of model.partIds) {
    if (nodes.some((n) => n.partId === partId && n.parentId === parent.id))
      continue;
    const n = node(
      "component:" + model.assembly + ":" + partId,
      parts.find((p) => p.id === partId)?.name || partId,
      parent.id,
      partId,
    );
    n.accuracy.visual = "illustrative";
    n.missingEvidence.push(
      "Alternative source identities can share a relationship illustration; installed applicability is not established.",
    );
    nodes.push(n);
  }
}
// Explicit component-to-geometry references; isolated recipes do not establish installed poses.
for (const n of nodes.filter((n) => n.partId)) {
  const nominal = nominalSealForPart(n.partId!);
  if (nominal) {
    const id = nominal.geometryId + ":r1";
    n.geometryRevisionId = id;
    n.accuracy.dimensions = "illustrative";
    n.missingEvidence = [
      "Catalog dimension interpretation requires technical review",
      "Manufacturer material/tolerance and installed deformation",
      "Configuration-specific mounting/alignment evidence",
    ];
    if (!geometry.some((g) => g.id === id))
      geometry.push({
        id,
        assetId: "nominal-seal-asset:" + n.partId,
        revision: 1,
        format: "glb",
        runtimePath: "/models/nominal-seals/" + nominal.number + "-medium.glb",
        sourceUnits: "m",
        metersPerUnit: 1,
        accuracy: {
          ...missingAccuracy(),
          visual: "illustrative",
          dimensions: "illustrative",
        },
        triangles: 2048,
        bytes: null,
        sourceIds: ["nominal-seal-source:" + n.partId],
        knownGaps: [
          nominal.interpretation,
          "No manufacturer tolerances, material, installed deformation or fitment approval",
        ],
      });
  } else {
    const parent = nodes.find((p) => p.id === n.parentId);
    if (parent?.geometryRevisionId)
      n.geometryRevisionId = parent.geometryRevisionId;
  }
}
const evidence = (locator: string) => [
  {
    sourceId: "bentley-e34-upload",
    locator,
    method: "Rendered source page inspection; access planning only",
    reviewState: "source-checked" as const,
  },
];
const dependencies = [
  [
    "pump-fan",
    "pump",
    "fan-clutch",
    "Fan and clutch access is required (170-8, 170-12).",
  ],
  [
    "pump-shroud",
    "pump",
    "fan-shroud",
    "The fan shroud must be clear (170-8).",
  ],
  [
    "pump-belt",
    "pump",
    "drive-belt",
    "Remove the accessory belt using the matching tensioner procedure (020-13, 170-8).",
  ],
  [
    "pump-pulley-access",
    "pump",
    "pump-pulley",
    "Remove the coolant-pump pulley (170-8).",
  ],
  [
    "pump-nuts",
    "pump",
    "pump-retaining-nuts",
    "Four retaining nuts secure the pump (170-8).",
  ],
  [
    "pump-seal-access",
    "pump-seal",
    "pump",
    "The pump O-ring is accessible after pump removal (170-8).",
  ],
].map(([id, target, prerequisite, reason]) => ({
  id,
  target,
  prerequisite,
  reason,
  evidence: evidence("PDF 212–213 / 170-8–9; PDF 216 / 170-12"),
  reviewState: "source-checked" as const,
}));
// Deliberately retain missing removal approval: the complete bleed/cap sequence and
// exact installed hardware still require technical review. Free exploration works.
const repairSteps = [
  {
    id: "pump-identify",
    title: "Confirm engine and installed cooling hardware",
    nodeIds: ["engine", "pump"],
    requiredRemoved: [],
  },
  {
    id: "pump-access",
    title: "Review fan, shroud and belt access",
    nodeIds: ["fan-clutch", "fan-shroud", "drive-belt"],
    requiredRemoved: [],
  },
  {
    id: "pump-attachments",
    title: "Identify pulley and pump retaining nuts",
    nodeIds: ["pump-pulley", "pump-retaining-nuts"],
    requiredRemoved: [],
  },
  {
    id: "pump-seal-review",
    title: "Inspect the pump and replacement seal references",
    nodeIds: ["pump", "pump-seal"],
    requiredRemoved: ["pump"],
  },
].map((step) => ({
  ...step,
  guideId: "m50-water-pump-job-planning",
  evidence: evidence("PDF 212–213 / 170-8–9"),
  reviewState: "source-checked" as const,
}));
export const initialTwinGraph: TwinGraph = {
  id: "e34-525i-m50-workshop",
  revision: "reference-3",
  configuration: {
    id: configurationId,
    modelId: "525i",
    referenceYear: 1995,
    engineFamily: "M50",
    engineVariant: null,
    body: "Sedan",
    market: null,
    productionDate: null,
    sourceIds: ["bentley-e34-upload"],
    reviewState: "illustrative",
    rootNodeId: "vehicle",
    notes: [
      "Exact M50/M50TU installation, production date, market, steering and transmission need confirmation.",
      "Exterior and isolated reference assemblies do not constitute a dimensionally verified complete vehicle.",
      "The catalog contains many more part identities than currently have licensed, reviewed 3D geometry.",
    ],
  },
  nodes,
  geometry,
  connections: [],
  dependencies,
  removalPaths: [],
  repairSteps,
};
export const referenceAreaNames = areas;
