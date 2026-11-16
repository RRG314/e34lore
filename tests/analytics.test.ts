import { describe, it, expect, vi } from "vitest";
import {
  normalizeSearch,
  validEvent,
  validEnvelope,
} from "../supabase/functions/_shared/analytics-contract.mjs";
import {
  analyticsService,
  referrerDomain,
} from "../supabase/functions/analytics/core.mjs";
import {
  rangeFor,
  compareMetricCells,
  comparison,
  summaryText,
  opportunities,
} from "../src/analytics/report";
const uuid = (n: number) =>
  "e3400000-0000-4000-8000-" + String(n).padStart(12, "0");
const event = (extra = {}) => ({
  v: 1,
  id: uuid(1),
  page: uuid(2),
  name: "page_view",
  resource: "/workshop",
  seq: 0,
  at: Date.now(),
  ...extra,
});
const envelope = (extra = {}) => ({
  revision: 2,
  visitor: uuid(3),
  consent: { traffic: true, search: true, performance: true },
  events: [event()],
  device: "desktop",
  browser: "Chrome",
  ...extra,
});
const request = (
  body: unknown,
  extra: Record<string, string> = {},
  path = "",
) =>
  new Request("https://example.invalid/analytics" + path, {
    method: "POST",
    headers: {
      origin: "https://e34lore.com",
      "content-type": "application/json",
      "user-agent": "Mozilla/5.0 Chrome/140.0",
      ...extra,
    },
    body: JSON.stringify(body),
  });
const dependencies = () => ({
  rpc: vi.fn().mockResolvedValue({ accepted: 1, status: "recorded" }),
  identity: vi.fn().mockResolvedValue({ id: uuid(9) }),
  isStaff: vi.fn().mockResolvedValue(false),
  authorize: undefined as ((token: string) => Promise<boolean>) | undefined,
  providerConfig: undefined,
  knownPages: new Set<string>(),
});
describe("analytics privacy contract", () => {
  it.each([
    "me@example.com water pump",
    "WBAHD6312SBJ12345",
    "Call 555-123-4567",
    "https://example.com/private?token=abc",
    "e3400000-0000-4000-8000-000000000001",
  ])("does not retain sensitive search %s", (q) =>
    expect(normalizeSearch(q)).toBe("other technical search"),
  );
  it("retains recognized technical topics, not names or unknown text", () => {
    expect(normalizeSearch("Steven needs VANOS seals!!!")).toBe("vanos");
    expect(normalizeSearch("M50 coolant pump repair")).toBe(
      "m50 coolant pump repair",
    );
  });
  it("rejects camera/user/URL payloads, unknown revisions and absent consent", () => {
    expect(validEvent(event({ vin: "PRIVATE" }))).toBe(false);
    expect(validEvent(event({ name: "scanner_open" }))).toBe(false);
    expect(validEnvelope(envelope({ revision: 1 }))).toBe(false);
    expect(
      validEnvelope(
        envelope({
          consent: { traffic: false, search: true, performance: true },
        }),
      ),
    ).toBe(false);
    expect(
      validEnvelope(
        envelope({
          events: [
            event({
              name: "search",
              search_id: uuid(8),
              topic: "email secret name",
              results: 0,
            }),
          ],
        }),
      ),
    ).toBe(false);
  });
  it("requires complete search outcomes and bounds values", () => {
    expect(validEvent(event({ name: "search" }))).toBe(false);
    expect(
      validEvent(event({ name: "web_vital", metric: "LCP", value: Infinity })),
    ).toBe(false);
    expect(
      validEvent(event({ name: "web_vital", metric: "CLS", value: 0.12 })),
    ).toBe(true);
    expect(
      validEnvelope(
        envelope({ events: Array.from({ length: 21 }, () => event()) }),
      ),
    ).toBe(false);
  });
  it.each([
    ["forum.example.co.uk", "example.co.uk"],
    ["alice.github.io", "github.io"],
    ["accounts.google.com", null],
    ["e34lore.com", null],
    ["127.0.0.1", null],
    ["localhost", null],
    ["example.com/private", null],
    ["user:password@example.com", null],
    ["example.com?token=secret", null],
  ])("reduces referrer %s", (value, want) =>
    expect(referrerDomain(value)).toBe(want),
  );
});
describe("collector HTTP boundary", () => {
  it("validates before calling service-only ingest", async () => {
    const d = dependencies();
    const r = await analyticsService(request(envelope()), d);
    expect(r.status).toBe(200);
    expect(d.rpc).toHaveBeenCalledWith(
      "analytics_ingest",
      expect.objectContaining({ browser_id: uuid(3) }),
    );
    expect(r.headers.get("cache-control")).toBe("no-store");
  });
  it("blocks unapproved origins, bot QA and oversized bodies", async () => {
    const d = dependencies();
    expect(
      (
        await analyticsService(
          request(envelope(), { origin: "https://attacker.invalid" }),
          d,
        )
      ).status,
    ).toBe(403);
    expect(
      (
        (await (
          await analyticsService(
            request(envelope(), { "user-agent": "HeadlessChrome" }),
            d,
          )
        ).json()) as { status: string }
      ).status,
    ).toBe("excluded");
    expect(
      (await analyticsService(request({ padding: "x".repeat(17000) }), d))
        .status,
    ).toBe(413);
    expect(d.rpc).not.toHaveBeenCalled();
  });
  it("rejects sensitive fields, staff and invalid user credentials", async () => {
    const d = dependencies();
    expect(
      (
        await analyticsService(
          request(envelope({ events: [event({ email: "hidden" })] })),
          d,
        )
      ).status,
    ).toBe(400);
    const token =
      "e30." + btoa(JSON.stringify({ sub: uuid(9) })) + ".signature";
    d.isStaff.mockResolvedValue(true);
    expect(
      (
        (await (
          await analyticsService(
            request(envelope(), { authorization: "Bearer " + token }),
            d,
          )
        ).json()) as { status: string }
      ).status,
    ).toBe("excluded");
    d.identity.mockResolvedValue(null as never);
    expect(
      (
        await analyticsService(
          request(envelope(), { authorization: "Bearer " + token }),
          d,
        )
      ).status,
    ).toBe(401);
    expect(d.rpc).not.toHaveBeenCalled();
  });
  it("supports deletion even with collection paused and bot user agent", async () => {
    const d = dependencies();
    const r = await analyticsService(
      request({ visitor: uuid(3) }, { "user-agent": "test" }, "/forget"),
      d,
    );
    expect(r.status).toBe(200);
    expect(d.rpc).toHaveBeenCalledWith("analytics_forget", {
      browser_id: uuid(3),
    });
  });
  it("does not return SQL failures or other secrets", async () => {
    const d = dependencies();
    d.rpc.mockRejectedValue(new Error("PRIVATE-SECRET-SQL"));
    const r = await analyticsService(request(envelope()), d);
    expect(r.status).toBe(503);
    expect(await r.text()).not.toContain("PRIVATE");
  });
});
describe("range and reporting semantics", () => {
  it("uses UTC calendar dates across month/year boundaries", () => {
    expect(rangeFor("Last 7 days", new Date("2026-01-03T01:00:00Z"))).toEqual({
      first: "2025-12-28",
      last: "2026-01-03",
    });
    expect(rangeFor("Yesterday", new Date("2026-01-01T01:00:00Z"))).toEqual({
      first: "2025-12-31",
      last: "2025-12-31",
    });
  });
  it("does not invent a growth percentage with no baseline", () => {
    expect(comparison(12, 0, false)).toContain("unavailable");
    expect(comparison(12, 0, true)).toContain("No percentage");
    expect(comparison(12, 10, true)).toBe("+20.0% vs previous period");
  });
  it("requires sample thresholds and does not claim significance", () => {
    const r = {
      start: "a",
      end: "b",
      generated_at: "c",
      current: {
        available: false,
        views: 0,
        sessions: 0,
        browsers: 0,
        search_pages: 0,
        pages: [],
        topics: [{ topic: "vanos", zero_results: 1, sessions: 1, searches: 1 }],
        errors: [],
        performance: [],
      },
      previous: { available: false },
      community: { unanswered: 0 },
      commercial: { revenue: [] },
      legacy: [],
    } as never;
    expect(opportunities(r)).toEqual([]);
    expect(summaryText(r)).toContain("Expanded collection unavailable");
    expect(summaryText(r)).not.toContain("Measured public-page views: 0");
  });
});

describe("Search Console preparation", () => {
  it("only queries E34 property, final data, preserves missing dates and scrubs topics", async () => {
    const { searchConsoleReport } = await import(
      "../supabase/functions/analytics/search-console.mjs"
    );
    const bodies: Record<string, unknown>[] = [];
    const fetcher = vi.fn(
      async (_url: RequestInfo | URL, init?: RequestInit) => {
        const b = JSON.parse(String(init?.body));
        bodies.push(b);
        return new Response(
          JSON.stringify({
            rows:
              b.dimensions.length === 1
                ? [
                    {
                      keys: ["2026-11-05"],
                      clicks: 3,
                      impressions: 10,
                      position: 2,
                    },
                  ]
                : b.dimensions[1] === "query"
                  ? [
                      {
                        keys: ["2026-11-05", "me@example.com vanos"],
                        clicks: 1,
                        impressions: 5,
                        position: 3,
                      },
                    ]
                  : [
                      {
                        keys: [
                          "2026-11-05",
                          "https://e34lore.com/garage/private-car?vin=PRIVATE",
                        ],
                        clicks: 1,
                        impressions: 2,
                        position: 1,
                      },
                      {
                        keys: [
                          "2026-11-05",
                          "https://e34lore.com/workshop?token=PRIVATE",
                        ],
                        clicks: 2,
                        impressions: 5,
                        position: 2,
                      },
                    ],
          }),
        );
      },
    );
    const report = await searchConsoleReport({
      property: "sc-domain:e34lore.com",
      start: "2026-11-01",
      end: "2026-11-07",
      accessToken: "FIXTURE-NOT-A-REAL-KEY",
      fetcher,
      knownPages: new Set(["/workshop"]),
    });
    expect(fetcher).toHaveBeenCalledTimes(3);
    expect(
      bodies.every((b) => b.dataState === "final" && b.type === "web"),
    ).toBe(true);
    expect(report.rows.filter((r) => r.dimension === "date")).toHaveLength(1);
    expect(JSON.stringify(report)).not.toMatch(
      /PRIVATE|example.com|token|private-car/,
    );
    expect(report.rows.find((r) => r.dimension === "query")?.key).toBe(
      "other technical search",
    );
    await expect(
      searchConsoleReport({
        property: "sc-domain:worldexplorer.example",
        start: "2026-11-01",
        end: "2026-11-07",
        accessToken: "FIXTURE",
        fetcher,
        knownPages: new Set(),
      }),
    ).rejects.toThrow("E34");
  });
  it("never exposes token refresh errors or provider response text", async () => {
    const { refreshSearchConsole } = await import(
      "../supabase/functions/analytics/search-console.mjs"
    );
    await expect(
      refreshSearchConsole({
        clientId: "fixture",
        clientSecret: "fixture",
        refreshToken: "fixture",
        fetcher: async () => new Response("SECRET", { status: 401 }),
      }),
    ).rejects.toThrow("authorization needs attention");
  });
  it("requires actual administrator authorization before provider setup or requests", async () => {
    const d = dependencies();
    const r = await analyticsService(
      request(
        { start: "2026-11-01", end: "2026-11-07" },
        {},
        "/search-console",
      ),
      { ...d, authorize: async () => false },
    );
    expect(r.status).toBe(403);
    expect(d.rpc).not.toHaveBeenCalled();
    const notConfigured = await analyticsService(
      request(
        { start: "2026-11-01", end: "2026-11-07" },
        {},
        "/search-console",
      ),
      { ...d, authorize: async () => true },
    );
    expect(notConfigured.status).toBe(409);
  });
});

describe("public resource registry deployment boundary", () => {
  it("keeps browser, Edge and migration public identities in sync", async () => {
    const fs = await import("node:fs/promises");
    const resources = JSON.parse(
      await fs.readFile("src/analytics/resources.json", "utf8"),
    );
    expect(
      JSON.parse(
        await fs.readFile(
          "supabase/functions/analytics/resources.json",
          "utf8",
        ),
      ),
    ).toEqual(resources);
    const names = await fs.readdir("supabase/migrations");
    const migrations = (
      await Promise.all(
        names
          .filter((n) => n.endsWith(".sql"))
          .map((n) => fs.readFile("supabase/migrations/" + n, "utf8")),
      )
    ).join("\n");
    for (const r of resources) {
      expect(
        migrations,
        `Missing additive resource migration for ${r.id}`,
      ).toContain("('" + r.id.replaceAll("'", "''") + "','" + r.path + "'");
      expect(r.id).not.toMatch(/^\/(garage|account|support|manage)(\/|$)/);
    }
  });
});

describe("actual provider state in downloaded reports", () => {
  it("uses real dated provider totals without adding query/page rows or claiming disconnection", () => {
    const r = {
      start: "a",
      end: "b",
      generated_at: "c",
      current: {
        available: false,
        views: 0,
        sessions: 0,
        browsers: 0,
        search_pages: 0,
        pages: [],
        topics: [],
        errors: [],
        performance: [],
      },
      previous: { available: false },
      community: { unanswered: 0 },
      commercial: { revenue: [] },
      legacy: [],
      search_console: {
        status: { property: "sc-domain:e34lore.com" },
        rows: [
          { dimension: "date", clicks: 3, impressions: 17 },
          { dimension: "query", clicks: 2, impressions: 10 },
        ],
      },
      integrations: {
        search_console: "data_imported_check_last_sync",
        email: "disabled_sender_not_verified",
      },
    } as never;
    const text = summaryText(r);
    expect(text).toContain("3 organic clicks and 17 search impressions");
    expect(text).not.toContain("5 organic clicks");
    expect(text).toContain("data imported check last sync");
    expect(text).not.toContain("are not connected");
  });
});

describe("precise numeric report sorting", () => {
  it("sorts exact cents numerically beyond Number safe-integer precision", () => {
    expect(
      ["20", "100", "9007199254740993", "9007199254740992", "-3"].sort(
        compareMetricCells,
      ),
    ).toEqual(["-3", "20", "100", "9007199254740992", "9007199254740993"]);
  });
  it("preserves numeric counters and ISO-date ordering", () => {
    expect([2, 10, 1].sort(compareMetricCells)).toEqual([1, 2, 10]);
    expect(["2026-11-08", "2026-10-31"].sort(compareMetricCells)).toEqual([
      "2026-10-31",
      "2026-11-08",
    ]);
  });
});
