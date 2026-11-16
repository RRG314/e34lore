import { describe, it, expect, vi } from "vitest";
import {
  advertisingSection,
  publicHttpsUrl,
  generateAffiliateUrl,
  eligibleMatch,
  currentObservation,
  money,
  csvCell,
  type MatchEvidence,
} from "../src/domain/affiliates";
import { checkAffiliateDestination } from "../src/lib/affiliate-link-check";
const approved = {
  approved: true,
  template:
    "https://track.example/c/{publisher_id}/{campaign_id}?u={destination}",
  destination: "https://parts.example/item?sku=1",
  merchantHosts: ["parts.example"],
  trackingHosts: ["track.example"],
  parameters: { publisher_id: "42", campaign_id: "7" },
  allowedQuery: ["u"],
};
describe("authorized affiliate links", () => {
  it("uses approved real identifiers and encodes the destination exactly once", () => {
    const link = generateAffiliateUrl(approved);
    expect(link).toContain("/42/7?");
    expect(new URL(link).searchParams.get("u")).toBe(approved.destination);
  });
  it("rejects absent approval, missing identifiers and undocumented query parameters", () => {
    for (const input of [
      { ...approved, approved: false },
      { ...approved, parameters: {} },
      { ...approved, allowedQuery: [] },
      { ...approved, template: "https://track.example/{secret}" },
    ])
      expect(() => generateAffiliateUrl(input)).toThrow();
  });
  it("rejects open redirects, credentials, non-public hosts and malicious URLs", () => {
    for (const url of [
      "http://parts.example/a",
      "https://parts.example@evil.example/a",
      "https://parts.example.evil.example/a",
      "https://parts.example/a?api_key=secret",
      "https://parts.example/a#secret",
      "https://127.0.0.1/a",
      "https://parts.example\\@evil.example/a",
      "https://parts.example/a\n",
    ])
      expect(publicHttpsUrl(url, ["parts.example"])).toBe(false);
  });
  it("checks only authorized hops and does not forward credentials", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(null, {
          status: 302,
          headers: { location: "https://evil.example/collect" },
        }),
      );
    expect(
      await checkAffiliateDestination(
        "https://track.example/a",
        ["track.example", "parts.example"],
        fetcher,
      ),
    ).toBe("blocked");
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0][1]?.headers).not.toHaveProperty(
      "Authorization",
    );
  });
  it("distinguishes missing products, permitted redirects and blocked checks", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(null, {
          status: 302,
          headers: { location: "https://parts.example/a" },
        }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 200 }));
    expect(
      await checkAffiliateDestination(
        "https://track.example/a",
        ["track.example", "parts.example"],
        fetcher,
      ),
    ).toBe("ok");
    expect(
      await checkAffiliateDestination(
        "https://parts.example/a",
        ["parts.example"],
        vi.fn().mockResolvedValue(new Response(null, { status: 404 })),
      ),
    ).toBe("broken");
    expect(
      await checkAffiliateDestination(
        "https://parts.example/a",
        ["parts.example"],
        vi.fn().mockResolvedValue(new Response(null, { status: 403 })),
      ),
    ).toBe("blocked");
  });
});
const match: MatchEvidence = {
  kind: "exact_verified",
  approved: true,
  sourceUrl: "https://parts.example/evidence",
  notes: "Reviewed direct identifier and source configuration evidence.",
  partId: "part-a",
  matchedPartId: "part-a",
  oemNumber: "11 51 1 711 484",
  partNumber: "11511711484",
  basis: "oem_identity",
  positionId: null,
};
describe("purchase-match boundaries", () => {
  it("allows a reviewed explicit identifier without claiming vehicle fitment", () =>
    expect(eligibleMatch(match)).toBe(true));
  it("withholds unverified, incompatible, mismatched and unresolved source scopes", () => {
    for (const value of [
      { ...match, approved: false },
      { ...match, kind: "unverified_candidate" as const },
      { ...match, kind: "known_incompatible" as const },
      { ...match, oemNumber: "11511711485" },
      { ...match, positionId: "position-a" },
    ])
      expect(eligibleMatch(value)).toBe(false);
  });
  it("accepts only the direct directed supersession in its exact source position", () => {
    const replacement: MatchEvidence = {
      ...match,
      kind: "verified_replacement",
      basis: "direct_supersession",
      matchedPartId: "part-b",
      matchedPartNumber: "11511711485", oemNumber: "11511711485",
      positionId: "position-a",
      directEdge: {
        previous: "part-a",
        replacement: "part-b",
        position: "position-a",
      },
    };
    expect(eligibleMatch(replacement, "position-a")).toBe(true);
    expect(eligibleMatch(replacement, "position-b")).toBe(false);
    expect(
      eligibleMatch(
        {
          ...replacement,
          directEdge: {
            previous: "part-b",
            replacement: "part-c",
            position: "position-a",
          },
        },
        "position-a",
      ),
    ).toBe(false);
    expect(
      eligibleMatch(
        { ...replacement, partId: "part-b", matchedPartId: "part-a" },
        "position-a",
      ),
    ).toBe(false);
  });
  it("retains conditional classification and requires evidence for an equivalent", () => {
    expect(eligibleMatch({ ...match, kind: "conditional" })).toBe(true);
    expect(
      eligibleMatch({
        ...match,
        kind: "verified_replacement",
        basis: "documented_equivalent",
        notes: "Too little evidence",
      }),
    ).toBe(false);
  });
  it("does not display unauthorized, stale, missing or future price/stock observations", () => {
    const now = Date.parse("2026-11-07T12:00:00Z");
    expect(
      currentObservation(
        1234,
        "2026-11-06T00:00:00Z",
        "2026-11-08T00:00:00Z",
        true,
        now,
      ),
    ).toBe(1234);
    expect(
      currentObservation(
        1234,
        "2026-11-06T00:00:00Z",
        "2026-11-08T00:00:00Z",
        false,
        now,
      ),
    ).toBeNull();
    expect(
      currentObservation(
        1234,
        "2026-11-06T00:00:00Z",
        "2026-11-07T00:00:00Z",
        true,
        now,
      ),
    ).toBeNull();
    expect(
      currentObservation(
        1234,
        "2026-11-08T00:00:00Z",
        "2026-11-09T00:00:00Z",
        true,
        now,
      ),
    ).toBeNull();
  });
});
describe("commercial privacy and accounting", () => {
  it("excludes walkthroughs, diagnosis, workshop, private and staff pages", () => {
    for (const path of [
      "/guides/m50-oil",
      "/repairs",
      "/diagnose",
      "/workshop",
      "/garage",
      "/garages/owner/car",
      "/account",
      "/manage/partners",
      "/admin",
      "/community/admin",
      "/community/settings",
      "/community/new",
      "/community/thread-id",
      "/manual/170",
    ])
      expect(advertisingSection(path)).toBeNull();
    for (const path of [
      "/",
      "/parts/catalog",
      "/articles/source",
      "/encyclopedia",
      "/community",
      "/community/topics/cooling",
    ])
      expect(advertisingSection(path)).not.toBeNull();
  });
  it("formats exact integer cents, including reversals and very large totals", () => {
    expect(money("1234", "USD")).toBe("$12.34");
    expect(money("-5", "USD")).toBe("-$0.05");
    expect(money("900719925474099199", "USD")).toBe(
      "$9,007,199,254,740,991.99",
    );
  });
  it("escapes CSV records and formula-like text", () => {
    expect(csvCell('=HYPERLINK("evil")')).toBe('"\'=HYPERLINK(""evil"")"');
    expect(csvCell(-500)).toBe('"-500"');
    expect(csvCell("line,one\nline,two")).toBe('"line,one\nline,two"');
  });
});
