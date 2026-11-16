import { describe, it, expect } from "vitest";
import {
  guideRevision,
  guideStepContext,
  normalizedChecks,
  stepDiscussionHref,
} from "../src/domain/walkthrough";
import { e30Guides } from "../src/series/e30-repairs";
import { manualGuides } from "../src/data/manual";
import revisions from "../src/data/guide-revisions.json";
import { createHash } from "node:crypto";
import fs from "node:fs";
import vm from "node:vm";
describe("walkthrough identities and progress", () => {
  it("pins every canonical guide to its actual content and step order", () => {
    const guides = [...manualGuides, ...e30Guides];
    for (const g of guides) {
      const r = guideRevision(g.slug)!;
      expect(r.revision).toBe(
        createHash("sha256")
          .update(JSON.stringify(g))
          .digest("hex")
          .slice(0, 24),
      );
      expect(r.steps).toEqual(g.steps.map((s) => s.title));
    }
    expect(revisions).toHaveLength(guides.length);
  });
  it("rejects invalid, stale and foreign step context without accepting a nearby step", () => {
    const g = revisions[0];
    expect(guideStepContext(g.guide, g.revision, 1)?.title).toBe(g.steps[0]);
    for (const step of [-1, 0, 1.5, 999, "bad"])
      expect(guideStepContext(g.guide, g.revision, step)).toBeNull();
    expect(guideStepContext(g.guide, "forged", 1)).toBeNull();
    const url = new URL(
      stepDiscussionHref(g.guide, 1, "engine"),
      "https://e34lore.com",
    );
    expect(url.searchParams.get("guide_revision")).toBe(g.revision);
    expect(url.searchParams.get("guide_step")).toBe("1");
  });
  it("bounds and deduplicates checks loaded from a device", () => {
    expect(normalizedChecks([2, 0, 2, -1, 999, "1", null], 3)).toEqual([0, 2]);
    expect(normalizedChecks({}, 3)).toEqual([]);
  });
});
describe("installed app cache boundary", () => {
  it("never caches account, garage or API responses and returns only the reconnect fallback", async () => {
    type CacheEvent={request:Pick<Request,"method"|"mode"|"url">;respondWith:(response:Promise<Response>)=>void;waitUntil?:(work:Promise<unknown>)=>void};
    const listeners: Record<string, (e: CacheEvent) => void> = {},
      writes: string[] = [];
    const fallback = new Response("public offline fallback");
    const context = {
      URL,
      Response,
      fetch: async () => {
        throw new Error("offline");
      },
      caches: {
        match: async (path: string) => {
          expect(path).toBe("/offline");
          return fallback.clone();
        },
        open: async () => ({ put: async (path: string) => writes.push(path) }),
        keys: async () => [],
      },
      self: {
        location: { origin: "https://e34lore.com" },
        clients: { claim: async () => {} },
        addEventListener: (name: string, fn: (e: CacheEvent) => void) => {
          listeners[name] = fn;
        },
      },
    };
    vm.runInNewContext(
      fs.readFileSync(new URL("../public/sw.js", import.meta.url), "utf8"),
      context,
    );
    for (const path of ["/garage", "/account", "/community/new"]) {
      let response: Promise<Response> | undefined;
      listeners.fetch({
        request: {
          method: "GET",
          mode: "navigate",
          url: "https://e34lore.com" + path,
        },
        respondWith: (p: Promise<Response>) => {
          response = p;
        },
      });
      expect(await (await response!)!.text()).toBe("public offline fallback");
    }
    let intercepted = false;
    listeners.fetch({
      request: {
        method: "GET",
        mode: "cors",
        url: "https://ebaebzuergvpijtrloik.supabase.co/rest/v1/owned_vehicles",
      },
      respondWith: () => {
        intercepted = true;
      },
    });
    expect(intercepted).toBe(false);
    expect(writes).toEqual([]);
  });
  it("ships one install manifest with icons and shortcuts for both series", () => {
    const m = JSON.parse(
      fs.readFileSync(
        new URL("../public/manifest.webmanifest", import.meta.url),
        "utf8",
      ),
    );
    expect(m.scope).toBe("/");
    expect(m.display).toBe("standalone");
    expect((m.shortcuts as {url:string}[]).map((s) => s.url)).toEqual([
      "/scanner",
      "/parts/catalog",
      "/workshop?mode=build",
      "/garage",
      "/repairs",
      "/community",
      "/workshop",
      "/quick-reference",
      "/e30/workshop",
      "/parts/interchange",
    ]);
    for (const i of m.icons)
      expect(fs.existsSync(new URL("../public" + i.src, import.meta.url))).toBe(
        true,
      );
  });
});
