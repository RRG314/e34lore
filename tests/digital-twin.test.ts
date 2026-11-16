import { releasePublic, hasReleasePack } from './release-content';
import { describe, it, expect } from "vitest";
import {
  identityTransform,
  missingAccuracy,
  type TwinGraph,
} from "../src/digital-twin/types";
import {
  validateGraph,
  createWorkshop,
  removeNode,
  restoreNode,
  undoWorkshop,
  redoWorkshop,
  validateWorkshop,
  canMeasure,
} from "../src/digital-twin/graph";
const fixture = (): TwinGraph => ({
  id: "test",
  revision: "1",
  configuration: {
    id: "config",
    modelId: "525i",
    referenceYear: 1995,
    engineFamily: "M50",
    engineVariant: null,
    body: "Sedan",
    market: null,
    productionDate: null,
    sourceIds: ["fixture"],
    reviewState: "illustrative",
    rootNodeId: "vehicle",
    notes: [],
  },
  nodes: ["vehicle", "fastener", "cover"].map((id, i) => ({
    id,
    parentId: i ? "vehicle" : null,
    name: id,
    partId: null,
    catalogAssemblyId: null,
    geometryRevisionId: null,
    transform: identityTransform(),
    configurationIds: ["config"],
    sourceIds: ["fixture"],
    guideIds: [],
    accuracy: { ...missingAccuracy(), removal: "source-checked" },
    missingEvidence: [],
  })),
  connections: [],
  dependencies: [
    {
      id: "cover-access",
      target: "cover",
      prerequisite: "fastener",
      reason: "Remove the retaining fastener first.",
      evidence: [
        {
          sourceId: "fixture",
          locator: "test only",
          method: "test fixture",
          reviewState: "source-checked",
        },
      ],
      reviewState: "source-checked",
    },
  ],
  removalPaths: [],
  repairSteps: [],
  geometry: [],
});
describe("digital twin assembly and workshop invariants", () => {
  it("rejects hierarchy and dependency cycles", () => {
    const g = fixture();
    g.nodes[1].parentId = "cover";
    g.nodes[2].parentId = "fastener";
    g.dependencies.push({
      ...g.dependencies[0],
      id: "cycle",
      target: "fastener",
      prerequisite: "cover",
    });
    expect(validateGraph(g).join(" ")).toMatch(/Circular hierarchy/);
    expect(validateGraph(g).join(" ")).toMatch(/Circular disassembly/);
  });
  it("rejects nonfinite transforms and missing geometry", () => {
    const g = fixture();
    g.nodes[1].transform.translation[0] = NaN;
    g.nodes[1].geometryRevisionId = "unknown";
    expect(validateGraph(g).join(" ")).toMatch(/Invalid transform/);
    expect(validateGraph(g).join(" ")).toMatch(/Missing geometry/);
  });
  it("enforces removal order, reverse installation and undo/redo", () => {
    const g = fixture();
    let s = createWorkshop(g);
    s.mode = "constrained";
    expect(() => removeNode(g, s, "cover")).toThrow(/retaining fastener/);
    s = removeNode(g, s, "fastener");
    s = removeNode(g, s, "cover");
    expect(() => restoreNode(g, s, "fastener")).toThrow(/Reinstall/);
    s = restoreNode(g, s, "cover");
    s = restoreNode(g, s, "fastener");
    expect(s.present.removed).toEqual([]);
    expect(undoWorkshop(s).present.removed).toEqual(["fastener"]);
    expect(redoWorkshop(undoWorkshop(s)).present.removed).toEqual([]);
  });
  it("allows educational exploration without certifying a removal procedure", () => {
    const g = fixture();
    g.nodes[2].accuracy.removal = "missing";
    const s = createWorkshop(g);
    expect(removeNode(g, s, "cover").present.removed).toEqual(["cover"]);
    s.mode = "constrained";
    expect(() => removeNode(g, s, "cover")).toThrow(/source review/);
  });
  it("rejects mismatched saved revisions and unreachable constrained states", () => {
    const g = fixture(),
      s = createWorkshop(g);
    s.graphRevision = "old";
    s.mode = "constrained";
    s.present.removed = ["cover"];
    expect(validateWorkshop(g, s).join(" ")).toMatch(/different.*revision/);
    expect(validateWorkshop(g, s).join(" ")).toMatch(/prerequisite/);
  });
  it("does not expose metric measurements for uncalibrated reference geometry", () => {
    const g = fixture();
    expect(canMeasure(g, "cover")).toBe(false);
  });
});

import { initialTwinGraph } from "../src/digital-twin/reference-configuration";
it("registers a complete vehicle hierarchy without claiming missing internal geometry", () => {
  expect(validateGraph(initialTwinGraph)).toEqual([]);
  expect(
    initialTwinGraph.nodes.filter((n) => n.parentId === "vehicle").length,
  ).toBe(19);
  expect(
    initialTwinGraph.nodes.find((n) => n.id === "engine")?.geometryRevisionId,
  ).toBeNull();
  expect(
    initialTwinGraph.geometry.every(
      (g) => g.accuracy.dimensions !== "verified",
    ),
  ).toBe(true);
});

import { parseWorkshop } from "../src/digital-twin/validation";
import { changeWorkshopMode } from "../src/digital-twin/graph";
import { inspectGLB } from "../src/digital-twin/assets/glb";
import fs from "node:fs";
it("rejects malformed and oversized workshop histories", () => {
  const g = fixture(),
    s = createWorkshop(g);
  expect(() =>
    parseWorkshop(
      { ...s, present: { ...s.present, removed: ["cover", "cover"] } },
      g,
    ),
  ).toThrow();
  expect(() =>
    parseWorkshop({ ...s, past: Array(101).fill(s.present) }, g),
  ).toThrow();
  expect(() => parseWorkshop({ ...s, mode: null }, g)).toThrow();
});
it("does not carry unsupported free removals into checked mode", () => {
  const g = fixture(),
    s = removeNode(g, createWorkshop(g), "cover");
  expect(() => changeWorkshopMode(g, s, "constrained")).toThrow(/Restore/);
});
it("checks historical constrained snapshots before restore", () => {
  const g = fixture(),
    s = createWorkshop(g);
  s.mode = "constrained";
  s.past = [{ ...s.present, removed: ["cover"] }];
  expect(() => parseWorkshop(s, g)).toThrow(/prerequisite/);
});
it("rejects root removal in imported exploration files", () => {
  const g = fixture(),
    s = createWorkshop(g);
  s.present.removed = ["vehicle"];
  expect(() => parseWorkshop(s, g)).toThrow(/root/);
});
it.skipIf(!hasReleasePack)("validates embedded exterior assets against real files", () => {
  for (const name of ["e34-body.glb", "e34-wheel.glb"]) {
    const f = fs.readFileSync((releasePublic + '/models/e34-525i/') + name);
    const r = inspectGLB(
      f.buffer.slice(f.byteOffset, f.byteOffset + f.byteLength),
    );
    expect(r.triangles).toBeGreaterThan(0);
    expect(r.meshes).toBeGreaterThan(0);
  }
});
it("rejects GLB external network dependencies and malformed headers", () => {
  expect(() => inspectGLB(new ArrayBuffer(20))).toThrow(/header/);
  const payload = new TextEncoder().encode(
    JSON.stringify({
      asset: { version: "2.0" },
      buffers: [{ uri: "https://untrusted.invalid/model.bin" }],
    }),
  );
  const size = Math.ceil(payload.length / 4) * 4,
    buffer = new ArrayBuffer(20 + size),
    v = new DataView(buffer);
  [0x46546c67, 2, 20 + size, size, 0x4e4f534a].forEach((x, i) =>
    v.setUint32(i * 4, x, true),
  );
  new Uint8Array(buffer, 20).fill(32);
  new Uint8Array(buffer, 20, payload.length).set(payload);
  expect(() => inspectGLB(buffer)).toThrow(/External/);
});

import {
  nominalSeals,
  referenceModelForPart,
} from "../src/digital-twin/model-registry";
import { manualGuides } from "../src/data/manual";
it("resolves every nominal seal to its canonical 3D model without claiming verified accuracy", () => {
  expect(nominalSeals).toHaveLength(48);
  for (const seal of nominalSeals) {
    expect(referenceModelForPart(seal.partId)?.assembly).toBe(seal.geometryId);
    expect(seal.accuracy.dimensions).not.toBe("verified");
    expect(seal.evidence.length).toBeGreaterThan(0);
  }
});
it("keeps repair scene links and reference component guide links valid", () => {
  for (const step of initialTwinGraph.repairSteps)
    expect(manualGuides.some((g) => g.slug === step.guideId)).toBe(true);
  for (const node of initialTwinGraph.nodes)
    for (const id of node.guideIds)
      expect(manualGuides.some((g) => g.slug === id)).toBe(true);
});

import * as T from "three";
import { vi } from "vitest";
import { disposeObject } from "../src/graphics/dispose";
it("releases shared model geometry, materials, texture and image data once", () => {
  const group = new T.Group(),
    geometry = new T.BoxGeometry(),
    image = { close: vi.fn() },
    texture = new T.Texture(),
    material = new T.MeshStandardMaterial({ map: texture });
  texture.source.data=image;
  const g = vi.spyOn(geometry, "dispose"),
    m = vi.spyOn(material, "dispose"),
    t = vi.spyOn(texture, "dispose");
  group.add(new T.Mesh(geometry, material), new T.Mesh(geometry, material));
  disposeObject(group);
  expect(g).toHaveBeenCalledTimes(1);
  expect(m).toHaveBeenCalledTimes(1);
  expect(t).toHaveBeenCalledTimes(1);
  expect(image.close).toHaveBeenCalledTimes(1);
});

import { initialViewport } from "../src/graphics/viewport";
it("keeps hidden-panel camera projections and fit distances finite before resize", () => {
  for (const [width, height] of [
    [0, 440],
    [640, 0],
    [0, 0],
    [NaN, Infinity],
  ]) {
    const v = initialViewport(width, height);
    const camera = new T.PerspectiveCamera(35, v.aspect, 0.0001, 500);
    const distance = Math.max(3 / camera.aspect, 2, 1) * 1.8;
    expect(Number.isFinite(distance)).toBe(true);
    expect(camera.projectionMatrix.elements.every(Number.isFinite)).toBe(true);
  }
  expect(initialViewport(1280, 900).aspect).toBe(1280 / 900);
});

import {
  canRenderReferenceModel,
  referenceModels,
} from "../src/digital-twin/model-registry";
import { buildAssembly } from "../src/graphics/assembly-geometry";
it("exposes every registered model in the catalog and rejects unsupported assembly fallbacks", () => {
  for (const model of referenceModels) {
    expect(canRenderReferenceModel(model.assembly)).toBe(true);
    const built=buildAssembly(model.assembly);
    expect(new Set(built.parts.flatMap(p=>p.ids).filter(id=>initialTwinGraph.nodes.some(n=>n.partId===id)))).toEqual(new Set(model.partIds));
    disposeObject(built.group);
  }
  for (const seal of nominalSeals)
    expect(canRenderReferenceModel(seal.geometryId)).toBe(true);
  expect(canRenderReferenceModel("catalog-assembly-unknown")).toBe(false);
  expect(() => buildAssembly("catalog-assembly-unknown")).toThrow(
    /Unregistered/,
  );
});
