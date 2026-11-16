import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { demoFetch } from "../src/demo/backend";
import { demoCatalog } from "../src/demo/catalog";
import pins from "../src/demo/model-pins.json";
import { parseReference } from "../src/digital-twin/public/model";
import { siteBackend, siteContent } from "../scripts/site-content.mjs";

describe("standalone demo", () => {
  it("ignores external configuration in demo mode", () => {
    const env = {
      NEXT_PUBLIC_SUPABASE_URL: "https://backend.example.invalid",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_fixture",
    };
    expect(siteBackend(env, siteContent(), "serve")).toMatchObject({
      mode: "demo", url: "https://demo.invalid",
    });
    expect(() => siteBackend({ ...env, E34_SITE_MODE: "local" }, siteContent(), "serve"))
      .toThrow("loopback");
  });

  it.each(["e34", "e30"] as const)("connects the %s model, drawing and search", async series => {
    const pin = pins[series];
    const fixture = demoCatalog[series];
    const bytes = await readFile("public" + pin.manifestUrl);
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(pin.sha256);
    const model = parseReference(JSON.parse(bytes.toString()));
    expect(model.openingPanels?.length).toBeGreaterThan(0);
    const pump = model.nodes.find(node => node.oem === fixture.entry.number);
    expect(pump?.sourceContext?.positionId).toBe(fixture.position.id);

    const search = await demoFetch("https://demo.invalid/rest/v1/rpc/catalog_find_series_parts", {
      method: "POST",
      body: JSON.stringify({ series_filter: series, search_query: fixture.entry.number }),
    });
    expect(await search.json()).toEqual([fixture.hit]);
    const drawing = await demoFetch("https://demo.invalid/rest/v1/technical_drawings?assembly_id=eq." + fixture.assembly.id);
    expect(await drawing.json()).toEqual([fixture.drawing]);
  });

  it("rejects auth, writes and network forwarding", async () => {
    const options = { method: "POST", body: "{}" };
    for (const url of [
      "https://demo.invalid/auth/v1/signup",
      "https://demo.invalid/rest/v1/reports",
      "https://demo.invalid/rest/v1/review_submissions",
      "https://backend.example.invalid/rest/v1/parts",
    ]) {
      expect((await demoFetch(url, options)).status).toBe(403);
    }
  });
});
