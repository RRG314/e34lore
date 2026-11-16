import { describe, expect, it } from "vitest";
import {
  changedContributionFields,
  revisionLabel,
} from "../src/domain/revisions";

describe("contribution history comparisons", () => {
  it("identifies text, source-link and configuration changes independently", () => {
    const changes = changedContributionFields(
      {
        body: "Observed at idle",
        part_id: "fan",
        vehicle_configuration: { year: "1994" },
      },
      {
        body: "Observed when cold",
        part_id: "pump",
        vehicle_configuration: { year: "1995" },
      },
    );
    expect(changes).toEqual(["Text", "Part link", "Vehicle configuration"]);
  });
  it("treats key ordering as equivalent while preserving observation order", () => {
    expect(
      changedContributionFields(
        { body: "A", vehicle_configuration: { model: "525i", engine: "M50" } },
        { body: "A", vehicle_configuration: { engine: "M50", model: "525i" } },
      ),
    ).toEqual([]);
    expect(
      changedContributionFields(
        { body: "A", observations: ["cold", "warm"] },
        { body: "A", observations: ["warm", "cold"] },
      ),
    ).toEqual(["Observations"]);
  });
  it("does not claim an imported baseline was the original contribution", () => {
    expect(revisionLabel({ content_version: 1, kind: "baseline" })).toBe(
      "Version 1 · Recorded baseline",
    );
    expect(revisionLabel({ content_version: 1, kind: "original" })).toBe(
      "Version 1 · Original",
    );
  });
});
