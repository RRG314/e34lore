import { describe, expect, it } from "vitest";
import { manualChapters, manualGuides } from "../src/data/manual";
import { manualJobs } from "../src/data/manual-jobs";
import { searchRepairReferences } from "../src/domain/repair-search";

const guides = (query: string, system?: string) =>
  searchRepairReferences(query, "", system).filter((result) => result.kind === "Guide");

describe("repair discovery", () => {
  it.each([
    ["How do I change my 1994 530i engine air filter?", "engine-air-filter-replacement"],
    ["replace the front windscreen wipers", "windshield-wiper-blade-replacement"],
    ["what should my cold tyre pressures be", "cold-tire-pressure-check"],
    ["1995 525i overheating at idle", "cooling-fan-airflow-check"],
    ["my E34 won't start, just clicks", "battery-connections-first-check"],
    ["serpentine belt", "accessory-drive-belt-inspection"],
    ["change oil and filter", "m50-engine-oil-and-filter"],
    ["replace low beam bulb", "factory-halogen-headlight-bulb"],
    ["window drops into door", "front-door-window-dropped-inspection"],
    ["cabin air filter", "e34-cabin-filter-replacement"],
    ["replace the brake pads", "factory-sliding-caliper-brake-pads"],
    ["vanos piston seals rebuild", "m50tu-vanos-piston-seals"],
    ["m20 timing belt replacement", "m20-timing-belt"],
    ["m50tu single vanos removal and installation", "m50tu-single-vanos-service"],
    ["automatic to manual transmission swap 525i", "e34-525i-five-speed-swap"],
    ["S52 engine swap", "e34-525i-s52-engine-swap"],
    ["vanos delete", "m50tu-vanos-delete-planning"],
    ["SLS delete", "e34-self-leveling-suspension-conversion"],
  ])("finds a guide for %s", (query, expected) => {
    expect(guides(query)[0]?.id).toBe(expected);
  });

  it.each([
    ["head gasket replacement", "/manual/113"],
    ["wiring diagram", "/manual/EWD"],
  ])("offers a source without passing it off as a walkthrough for %s", (query, source) => {
    const results = searchRepairReferences(query);
    expect(results.some((result) => result.kind === "Guide")).toBe(false);
    expect(results.some((result) => result.kind === "Source" && result.href === source)).toBe(true);
  });

  it.each([
    ["brake pedal pulsation", "/diagnostics?symptom=braking", "/manual/340"],
    ["steering wheel shakes at 55 mph", "/diagnostics?symptom=vibration", "/manual/310"],
  ])("routes %s to triage and the correct chapter", (query, diagnosis, chapter) => {
    const results = searchRepairReferences(query);
    expect(results[0]?.href).toBe(diagnosis);
    expect(results.some((result) => result.href === chapter)).toBe(true);
  });

  it("offers both the blower diagnosis guide and factory chapter", () => {
    const results = searchRepairReferences("heater blower only works on high");
    expect(results.some((result) => result.href === "/guides/e34-blower-speed-diagnosis")).toBe(true);
    expect(results.some((result) => result.href === "/manual/640")).toBe(true);
  });

  it("deep links to the indexed job even when a walkthrough is unavailable", () => {
    const results = searchRepairReferences("head gasket replacement");
    expect(results.some((result) => result.kind === "Manual job" && result.href.startsWith("/repairs/113-job-m50"))).toBe(true);
  });

  it("indexes every chapter with valid locators and existing guide links", () => {
    const guideIds = new Set(manualGuides.map((guide) => guide.slug));
    for (const chapter of manualChapters) {
      const jobs = manualJobs(chapter.id);
      expect(jobs.length).toBeGreaterThan(0);
      expect(new Set(jobs.map((job) => job.anchor)).size).toBe(jobs.length);
      for (const job of jobs) {
        expect(job.page).toBeGreaterThanOrEqual(1);
        expect(chapter.pdfStart + job.page - 1).toBeLessThanOrEqual(chapter.pdfEnd);
        if (job.guide) expect(guideIds.has(job.guide)).toBe(true);
      }
    }
  });

  it("respects the system filter and avoids guessing on a part number", () => {
    expect(guides("air filter", "brakes")).toEqual([]);
    expect(guides("cabin air filter", "climate")[0]?.id).toBe("e34-cabin-filter-replacement");
    expect(guides("electric fan conversion", "cooling")[0]?.id).toBe("e34-electric-fan-conversion");
    expect(searchRepairReferences("11 51 7 527 799")).toEqual([]);
    expect(searchRepairReferences("340")[0]?.href).toBe("/manual/340");
  });
});
