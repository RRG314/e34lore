import { describe, it, expect, vi, afterEach } from "vitest";
import {
  partMarkings,
  cosine,
  rankReferences,
  visualDecision,
  boxSchema,
  referenceIndexSchema,
} from "../src/scanner/contracts";
import { coverCrop, quality, CameraController } from "../src/scanner/camera";
import {
  repairPlan,
  validatePlan,
  transitionOperations,
  repairScene,
} from "../src/repair/plan";
import {
  resolveConfiguration,
  validateVin,
  vinCandidates,
  decodeEvidence,
  repairApplicability,
  type ConfigurationEvidence,
} from "../src/vehicle/configuration";
import { emptyVehicle } from "../src/data/catalog";
import refs from "../public/scanner/reference-index.json";
afterEach(() => vi.unstubAllGlobals());
describe("local component evidence", () => {
  it("extracts complete exact markings without guessing missing characters", () => {
    expect(
      partMarkings(
        "BMW 11 51 1 315 559 and 11511315559; 11 51 I 315 559; 1315559",
      ),
    ).toEqual(["11511315559"]);
    expect(partMarkings("X11511315559B 1115113155599")).toEqual([]);
  });
  it("rejects malformed boxes and finite/dimension mismatches", () => {
    expect(
      boxSchema.safeParse({ xmin: 0.8, ymin: 0, xmax: 0.2, ymax: 1 }).success,
    ).toBe(false);
    expect(cosine([1], [1, 2])).toBe(-1);
    expect(cosine([NaN], [1])).toBe(-1);
    expect(cosine([1, 0], [1, 0])).toBe(1);
  });
  it("loads actual versioned reference vectors and rejects an automatic OEM claim", () => {
    const data = referenceIndexSchema.parse(refs);
    expect(data.records.length).toBe(16);
    for (const r of data.records) {
      expect(
        Math.abs(Math.sqrt(r.embedding.reduce((n, v) => n + v * v, 0)) - 1),
      ).toBeLessThan(0.0001);
    }
    const ranked = rankReferences(data.records[0].embedding, data.records);
    expect(ranked[0].nodeId).toBe(data.records[0].nodeId);
    expect(visualDecision(ranked).accepted).toBe(false);
  });
  it("maps object-cover capture without stretching the camera image", () => {
    expect(coverCrop(1920, 1080, 400, 300)).toEqual({
      x: 240,
      y: 0,
      width: 1440,
      height: 1080,
    });
    expect(coverCrop(1080, 1920, 300, 400)).toEqual({
      x: 0,
      y: 240,
      width: 1080,
      height: 1440,
    });
  });
  it("flags uniformly dark frames rather than inventing detail", () => {
    const q = quality(new Uint8ClampedArray(400), 10, 10);
    expect(q.warnings).toHaveLength(2);
  });
  it("stops a camera granted after the view has closed", async () => {
    const stop = vi.fn();
    let resolve!: (v: unknown) => void;
    vi.stubGlobal("navigator", {
      mediaDevices: {
        getUserMedia: vi.fn(() => new Promise((r) => (resolve = r))),
      },
    });
    const camera = new CameraController();
    const pending = camera.start({
      play: vi.fn(),
    } as unknown as HTMLVideoElement);
    camera.stop();
    resolve({ getTracks: () => [{ stop }] });
    expect(await pending).toBe(false);
    expect(stop).toHaveBeenCalledOnce();
  });
  it("stops every track if preview playback fails", async () => {
    const stop = vi.fn();
    vi.stubGlobal("navigator", {
      mediaDevices: {
        getUserMedia: async () => ({ getTracks: () => [{ stop }] }),
      },
    });
    const camera = new CameraController();
    await expect(
      camera.start({
        play: async () => {
          throw Error("play");
        },
      } as unknown as HTMLVideoElement),
    ).rejects.toThrow("preview");
    expect(stop).toHaveBeenCalled();
  });
});
describe("source-backed repair operations", () => {
  it("validates graph and prevents removal before access", () => {
    expect(validatePlan()).toBe(true);
    expect(() => transitionOperations([], "pump")).toThrow("preceding");
    expect(() => transitionOperations([], "imaginary")).toThrow("Unknown");
  });
  it("enforces forward/reverse dependencies and complete reassembly", () => {
    let done: string[] = [];
    for (const o of repairPlan.operations)
      done = transitionOperations(done, o.id);
    expect(done).toHaveLength(17);
    expect(repairScene(done, "final-check").hidden).toEqual([]);
    expect(() => transitionOperations(done, "pump", true)).toThrow("dependent");
    for (const o of [...repairPlan.operations].reverse())
      done = transitionOperations(done, o.id, true);
    expect(done).toEqual([]);
  });
  it("detects cycles rather than simulating a valid removal graph", () => {
    const bad = structuredClone(repairPlan);
    bad.operations[0].requires = ["final-check"];
    expect(() => validatePlan(bad)).toThrow("cycle");
  });
  it("pins a real guide revision and clearly labels geometry illustrative", () => {
    expect(repairPlan.revision).toBe("5c458d5b100cc7b4c5c2b469");
    expect(repairPlan.geometry).toBe("illustrative");
    expect(repairPlan.operations.every((o) => o.source && o.tools.length)).toBe(
      true,
    );
  });
});
describe("individual configuration evidence", () => {
  const factory: ConfigurationEvidence = {
    id: "factory",
    attribute: "engine",
    value: "M50TU",
    kind: "factory",
    source: "Build document",
  };
  const observed: ConfigurationEvidence = {
    id: "observed",
    attribute: "engine",
    value: "M60",
    kind: "modified",
    source: "Engine swap invoice",
  };
  it("keeps factory evidence while using observed installed hardware", () => {
    const r = resolveConfiguration(
      [factory, observed],
      {},
      { ...emptyVehicle, engine: "M50TU" },
    );
    expect(r.vehicle.engine).toBe("M60");
    expect(r.factory[0].value).toBe("M50TU");
    expect(repairApplicability(r.vehicle).status).toBe("incompatible");
  });
  it("does not silently select inferred hardware or resolve conflicts", () => {
    const inferred = { ...observed, id: "inferred", kind: "inferred" as const };
    expect(
      resolveConfiguration([inferred], {}, emptyVehicle).vehicle.engine,
    ).toBe("");
    const conflict = { ...observed, id: "other", value: "M50" };
    const r = resolveConfiguration([observed, conflict], {}, emptyVehicle);
    expect(r.conflicts).toEqual(["engine"]);
    expect(r.vehicle.engine).toBe("");
    expect(
      resolveConfiguration(
        [observed, conflict],
        { engine: "observed" },
        emptyVehicle,
      ).vehicle.engine,
    ).toBe("M60");
  });
  it("retains superseded evidence while choosing its replacement", () => {
    const next = {
      ...observed,
      id: "new",
      value: "M50",
      supersedes: "observed",
    };
    const r = resolveConfiguration([observed, next], {}, emptyVehicle);
    expect(r.vehicle.engine).toBe("M50");
    expect(r.conflicts).toEqual([]);
  });
  it("validates without substituting VIN characters or fabricating options", () => {
    expect(validateVin("WBAHD6320SGK12345").valid).toBe(true);
    expect(validateVin("WBAHD6320SGK1234I").valid).toBe(false);
    expect(vinCandidates("WBAHD6320SGK1234I")).toEqual([]);
    expect(validateVin("GK12345").partial).toBe(true);
    const e = decodeEvidence({
      Make: "BMW",
      ModelYear: "1995",
      VIN: "SECRET",
      OptionList: "invented",
    });
    expect(e.map((x) => x.attribute)).toEqual(["manufacturer", "year"]);
    expect(JSON.stringify(e)).not.toContain("SECRET");
  });
});

import {
  validEvent,
  categoryFor,
} from "../supabase/functions/_shared/analytics-contract.mjs";
describe("scanner telemetry privacy", () => {
  const e = {
    v: 1,
    id: "c3400000-0000-4000-8000-000000000001",
    page: "c3400000-0000-4000-9000-000000000001",
    at: Date.now(),
    seq: 1,
    resource: "/scanner",
  };
  it("accepts typed measurements while rejecting images, VINs and raw OCR", () => {
    expect(
      validEvent({ ...e, name: "scanner_inference", code: "ocr", value: 200 }),
    ).toBe(true);
    expect(categoryFor("scanner_inference")).toBe("performance");
    expect(validEvent({ ...e, name: "scanner_result", results: 0 })).toBe(true);
    for (const key of ["image", "vin", "ocr_text", "vehicle_id"])
      expect(
        validEvent({ ...e, name: "scanner_capture", [key]: "private" }),
      ).toBe(false);
    expect(validEvent({ ...e, name: "scanner_inference", code: "ocr" })).toBe(
      false,
    );
  });
});

describe("repair selection identity", () => {
  it("keeps the exact clicked member of a multi-component repair step", () => {
    expect(repairScene([], "fan-shroud", "e34sys:fan-shroud").selected).toBe(
      "e34sys:fan-shroud",
    );
    expect(repairScene([], "fan-shroud", "m50:oil-pump").selected).toBe(
      "e34sys:engine-cooling-fan",
    );
  });
});

import { normalizeDetection } from "../src/scanner/contracts";
it("clips genuine detection overhang while preserving model evidence and rejecting empty regions", () => {
  const d = {
    label: "a car starter motor",
    score: 0.25,
    box: { xmin: -0.00067, ymin: 0.15, xmax: 0.95, ymax: 1.004 },
  };
  expect(normalizeDetection(d)).toEqual({
    ...d,
    box: { xmin: 0, ymin: 0.15, xmax: 0.95, ymax: 1 },
  });
  expect(
    normalizeDetection({
      ...d,
      box: { xmin: 1.2, ymin: 0, xmax: 1.4, ymax: 1 },
    }),
  ).toBe(null);
});
