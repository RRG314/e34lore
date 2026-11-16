import { describe, it, expect } from "vitest";
import { restoreCommunityDraft } from "../src/community/drafts";
describe("discussion draft recovery", () => {
  it("preserves the member's work from the previous four-category release", () => {
    const result = restoreCommunityDraft({
      title: "My observation",
      body: "A detailed observation that must survive sign-in.",
      category: "Parts & fitment",
      part: "bmw-11511315559",
      model: "525i",
      observations: [{ question: "Does it crank?", answer: "Yes" }],
    });
    expect(result.body).toBe(
      "A detailed observation that must survive sign-in.",
    );
    expect(result.category).toBe("Parts, Compatibility & Sourcing");
    expect(result.part).toBe("bmw-11511315559");
    expect(result.observations).toHaveLength(1);
  });
  it("recovers content without allowing corrupted metadata to crash the editor", () => {
    expect(restoreCommunityDraft(null)).toEqual({});
    expect(restoreCommunityDraft([])).toEqual({});
    const result = restoreCommunityDraft({
      body: "Keep this text",
      template: "__proto__",
      tags: { bad: true },
      model: "unknown",
      starter: "forged",
      article: "made-up",
      observations: [{}, null, { question: "A", answer: [] }],
    });
    expect(result.body).toBe("Keep this text");
    expect(result.template).toBeUndefined();
    expect(result.tags).toBeUndefined();
    expect(result.model).toBe("");
    expect(result.starter).toBe("");
    expect(result.article).toBe("");
    expect(result.observations).toEqual([]);
  });
  it("bounds multibyte diagnostic transcripts and controlled tags before replay", () => {
    const result = restoreCommunityDraft({
      tags: ["engine:m50", "engine:m50", "status:reviewed", "forged"],
      observations: Array.from({ length: 50 }, () => ({
        question: "🔧".repeat(1000),
        answer: "🔧".repeat(1000),
      })),
    });
    expect(result.tags).toEqual(["engine:m50"]);
    expect(result.observations!.length).toBeGreaterThan(0);
    expect(
      new TextEncoder().encode(JSON.stringify(result.observations)).length,
    ).toBeLessThanOrEqual(15000);
  });
});
