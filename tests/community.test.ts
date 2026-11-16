import { describe, it, expect } from "vitest";
import {
  editorials,
  communityCategories,
  communitySources,
  communityTags,
  discussionTemplates,
  starterHref,
  templateBody,
} from "../src/community/content";
import { manualGuides } from "../src/data/manual";

describe("editorial launch package integrity", () => {
  it("offers a balanced, attributable resource library without fabricated conversations", () => {
    expect(editorials).toHaveLength(48);
    expect(new Set(editorials.map((e) => e.slug)).size).toBe(48);
    for (const category of communityCategories)
      expect(
        editorials.filter((e) => e.category === category.name),
      ).toHaveLength(6);
    for (const entry of editorials) {
      expect(entry.paragraphs.join(" ").length).toBeGreaterThan(250);
      expect(entry.prompts).toHaveLength(3);
      expect(entry.template in discussionTemplates).toBe(true);
    }
  });
  it("keeps every technical source and guide link resolvable", () => {
    for (const entry of editorials) {
      for (const id of entry.sources) {
        const source = communitySources[id];
        expect(source, entry.slug + ": " + id).toBeDefined();
        if (source.href.startsWith("/guides/"))
          expect(
            manualGuides.some((g) => g.slug === source.href.slice(8)),
          ).toBe(true);
        else expect(/^(https:\/\/|\/)/.test(source.href)).toBe(true);
      }
      if (entry.kind !== "resource")
        expect(entry.sources.length, entry.slug).toBeGreaterThan(0);
    }
  });
  it("hands off category, context and template without publishing a generated member post", () => {
    for (const entry of editorials) {
      const url = new URL(starterHref(entry), "https://example.invalid");
      expect(url.pathname).toBe("/community/new");
      expect(url.searchParams.get("starter")).toBe(entry.slug);
      expect(url.searchParams.get("category")).toBe(entry.category);
      expect(url.searchParams.has("body")).toBe(false);
      expect(url.searchParams.has("title")).toBe(false);
    }
  });
  it("has controlled distinct tags and no member-assignable technical verification", () => {
    expect(new Set(communityTags.map((t) => t.id)).size).toBe(
      communityTags.length,
    );
    expect(new Set(communityTags.map((t) => t.family)).size).toBe(10);
    expect(communityTags.some((t) => t.id === "status:reviewed")).toBe(false);
    expect(templateBody("interchange")).toContain("Limits");
    expect(templateBody("troubleshooting")).toContain(
      "method, units and result",
    );
  });
});
