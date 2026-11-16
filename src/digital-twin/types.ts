/** Digital-twin claims remain independent: appearance cannot certify dimensions or removal. */
export type ReviewState =
  | "missing"
  | "illustrative"
  | "source-checked"
  | "verified"
  | "disputed";
export type AccuracyAxis =
  | "visual"
  | "dimensions"
  | "alignment"
  | "mechanical"
  | "removal";
export type Accuracy = Record<AccuracyAxis, ReviewState>;
export type Vec3 = [number, number, number];
export type Quaternion = [number, number, number, number];
export type Transform = {
  translation: Vec3;
  rotation: Quaternion;
  scale: Vec3;
};
export type Evidence = {
  sourceId: string;
  locator: string;
  method: string;
  reviewState: ReviewState;
};
export type AssetLicense = {
  id: string;
  name: string;
  url: string;
  redistribution: "allowed" | "restricted" | "unknown";
  attribution: string;
};
export type AssetSource = {
  id: string;
  url: string;
  author: string;
  identity: string;
  licenseId: string;
  sha256: string | null;
};
export type GeometryRevision = {
  id: string;
  assetId: string;
  revision: number;
  format:
    | "glb"
    | "gltf"
    | "obj"
    | "fbx"
    | "stl"
    | "step"
    | "ply"
    | "point-cloud"
    | "procedural";
  runtimePath: string | null;
  sourceUnits: "m" | "mm" | "unknown";
  metersPerUnit: number | null;
  accuracy: Accuracy;
  triangles: number | null;
  bytes: number | null;
  sourceIds: string[];
  knownGaps: string[];
};
export type Connection = {
  id: string;
  from: string;
  to: string;
  kind: "mount" | "fastener" | "electrical" | "fluid";
  point: Vec3 | null;
  orientation: Quaternion | null;
  evidence: Evidence[];
  reviewState: ReviewState;
};
export type RemovalPath = {
  id: string;
  nodeId: string;
  kind: "documented" | "illustrative";
  points: Vec3[];
  evidence: Evidence[];
  reviewState: ReviewState;
};
export type AssemblyNode = {
  id: string;
  parentId: string | null;
  name: string;
  partId: string | null;
  catalogAssemblyId: string | null;
  geometryRevisionId: string | null;
  transform: Transform;
  configurationIds: string[];
  sourceIds: string[];
  guideIds: string[];
  accuracy: Accuracy;
  missingEvidence: string[];
};
export type Dependency = {
  id: string;
  target: string;
  prerequisite: string;
  reason: string;
  evidence: Evidence[];
  reviewState: ReviewState;
};
export type RepairSceneStep = {
  id: string;
  guideId: string;
  nodeIds: string[];
  requiredRemoved: string[];
  title: string;
  evidence: Evidence[];
  reviewState: ReviewState;
};
export type TwinConfiguration = {
  id: string;
  modelId: string;
  referenceYear: number;
  engineFamily: string;
  engineVariant: string | null;
  body: string;
  market: string | null;
  productionDate: string | null;
  sourceIds: string[];
  reviewState: ReviewState;
  rootNodeId: string;
  notes: string[];
};
export type TwinGraph = {
  id: string;
  revision: string;
  configuration: TwinConfiguration;
  nodes: AssemblyNode[];
  connections: Connection[];
  dependencies: Dependency[];
  removalPaths: RemovalPath[];
  repairSteps: RepairSceneStep[];
  geometry: GeometryRevision[];
};
export type WorkshopSnapshot = {
  removed: string[];
  hidden: string[];
  detached: string[];
  selected: string | null;
  explosion: number;
};
export type WorkshopState = {
  schemaVersion: 1;
  graphId: string;
  graphRevision: string;
  mode: "explore" | "constrained";
  present: WorkshopSnapshot;
  past: WorkshopSnapshot[];
  future: WorkshopSnapshot[];
};
export type ReconstructionJob = {
  id: string;
  partId: string | null;
  nodeId: string;
  method:
    | "licensed-cad"
    | "multiview"
    | "dimensioned-drawing"
    | "standard-parametric"
    | "manual-reconstruction";
  status:
    | "needs-evidence"
    | "ready"
    | "processing"
    | "review"
    | "published"
    | "failed";
  requiredViews: string[];
  requiredMeasurements: string[];
  sourceIds: string[];
  toolRequirements: string[];
  unresolved: string[];
};
export const identityTransform = (): Transform => ({
  translation: [0, 0, 0],
  rotation: [0, 0, 0, 1],
  scale: [1, 1, 1],
});
export const missingAccuracy = (): Accuracy => ({
  visual: "missing",
  dimensions: "missing",
  alignment: "missing",
  mechanical: "missing",
  removal: "missing",
});
