import { displayQuantity } from "../src/domain/units";
import { safeReturnPath } from "../src/domain/navigation";
import { describe, it, expect } from "vitest";
import { parts, emptyVehicle, assemblies } from "../src/data/catalog";
import { evaluateFitment, normalizePartNumber } from "../src/domain/fitment";
import { diagnosticFlows, validateFlow } from "../src/domain/diagnostics";
import { searchRecords } from "../src/domain/search";
import { manualChapters, manualGuides, manualSource } from "../src/data/manual";
describe("applicability boundaries", () => {
  const pump = parts.find((p) => p.id === "coolant-pump")!;
  const vehicle = {
    ...emptyVehicle,
    model: "525i",
    engine: "M50TU",
    year: "1995",
    month: "03",
    market: "USA",
  };
  it("does not establish fitment without vehicle identity", () =>
    expect(evaluateFitment(pump, emptyVehicle).status).toBe("unknown"));
  it("never treats a different catalog market as confirmed", () => {
    const r = evaluateFitment(pump, vehicle);
    expect(r.status).toBe("conditional");
    expect(r.reasons.join(" ")).toContain(
      "USA applicability is not established",
    );
  });
  it("rejects the wrong engine family", () =>
    expect(evaluateFitment(pump, { ...vehicle, engine: "M20" }).status).toBe(
      "incompatible",
    ));
  it("does not transfer applicability across models sharing an engine", () =>
    expect(evaluateFitment(pump, { ...vehicle, model: "520i" }).status).toBe(
      "unknown",
    ));
  it("enforces the documented production cutoff", () =>
    expect(
      evaluateFitment(
        parts.find((p) => p.id === "early-gasket")!,
        vehicle,
      ).status,
    ).toBe("incompatible"));
  it("does not convert a missing production month into a match", () =>
    expect(evaluateFitment(pump, { ...vehicle, month: "" }).reasons).toContain(
      "Production month is missing.",
    ));
  it("keeps unresearched OEM identities unknown", () =>
    expect(
      evaluateFitment(
        parts.find((p) => p.id === "strut-mount")!,
        vehicle,
      ).status,
    ).toBe("unknown"));
  it("normalizes spaced and dashed part identifiers", () =>
    expect(normalizePartNumber("11 51-7 527 799")).toBe("11517527799"));
});
describe("diagnostic safety and graph integrity", () => {
  for (const [name, flow] of Object.entries(diagnosticFlows))
    it(name + " has reachable terminating branches", () =>
      expect(validateFlow(flow)).toBe(true),
    );
  it("rejects a cycle rather than allowing an endless investigation", () =>
    expect(
      validateFlow([
        {
          id: "start",
          question: "a",
          note: "",
          source: "x",
          choices: [{ label: "b", next: "start" }],
        },
      ]),
    ).toBe(false));
  it("routes active overheating to a stop outcome", () => {
    const f = diagnosticFlows.overheating;
    expect(f[0].choices[0].next).toBe("stop");
    expect(f.find((n) => n.id === "stop")?.outcome).toContain("recovery");
  });
});
describe("source and cross-domain integrity", () => {
  it("keeps all chapter ranges within the actual upload and nonoverlapping", () => {
    expect(manualChapters).toHaveLength(47);
    const s = [...manualChapters].sort((a, b) => a.pdfStart - b.pdfStart);
    for (let i = 0; i < s.length; i++) {
      expect(s[i].pdfStart).toBeGreaterThan(0);
      expect(s[i].pdfEnd).toBeLessThanOrEqual(manualSource.pdfPageCount);
      if (i) expect(s[i].pdfStart).toBeGreaterThan(s[i - 1].pdfEnd);
    }
  });
  it("preserves source checks separately from technical certification", () => {
    for (const g of manualGuides) {
      expect(g.sourceChecked).toBe(true);
      expect(g.reviewStatus).toBe("draft");
      expect(g.source.pdfPages.length).toBeGreaterThan(0);
      expect(g.steps.every((s) => s.body && s.check)).toBe(true);
    }
  });
  it("gives every interactive part a stable assembly and source", () => {
    expect(new Set(parts.map((p) => p.id)).size).toBe(parts.length);
    for (const p of parts) {
      expect(assemblies.some((a) => a.id === p.assembly)).toBe(true);
      expect(p.source).toBeTruthy();
      expect(p.number === null || /^\d{11}$/.test(p.number)).toBe(true);
    }
  });
  it("ranks an exact OEM number above descriptive guesses", () => {
    const records = parts.map((p) => ({
      id: p.id,
      title: p.name,
      summary: p.note,
      kind: "Part",
      href: "/parts?part=" + p.id,
      number: p.number,
    }));
    expect(searchRecords(records, "11 51 7 527 799")[0]?.id).toBe(
      "coolant-pump",
    );
  });
  it("connects symptom language to sourced cooling guidance", () => {
    const records = manualGuides.map((g) => ({
      id: g.slug,
      title: g.title,
      summary: g.summary,
      kind: "Guide",
      href: "/guides/" + g.slug,
      system: g.system,
    }));
    expect(
      searchRecords(records, "1995 525i overheating at idle").some(
        (g) => g.id === "cooling-system-visual-check",
      ),
    ).toBe(true);
  });
});

describe("canonical quantities", () => {
  it("preserves the original value while converting dimensions", () => {
    const q = displayQuantity(25.4, "mm", true);
    expect(q.value).toBe(1);
    expect(q.canonical).toEqual({ value: 25.4, unit: "mm" });
  });
  it("handles temperature offsets instead of scaling only", () =>
    expect(displayQuantity(0, "C", true).value).toBe(32));
  it("rejects unusable numerical input", () =>
    expect(() => displayQuantity(NaN, "mm")).toThrow());
});
describe("post-login navigation", () => {
  it("keeps a local draft return URL", () =>
    expect(
      safeReturnPath("/community/new?part=coolant-pump", "https://e34.test"),
    ).toBe("/community/new?part=coolant-pump"));
  for (const value of [
    "https://elsewhere.test",
    "//elsewhere.test",
    "/\\elsewhere.test",
  ])
    it("rejects an external destination " + value, () =>
      expect(safeReturnPath(value, "https://e34.test")).toBe("/garage"),
    );
});
