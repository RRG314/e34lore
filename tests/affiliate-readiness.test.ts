import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { affiliateCatalogUrl, affiliateReadinessSchema, nextAffiliateStep, type RetailerReadiness } from "../src/domain/affiliate-readiness";
import { AffiliateReadinessPanel } from "../src/components/AffiliateReadiness";
import { RetailerDirectoryPanel, RetailerLinksUnavailable } from "../src/components/Commercial";

const retailer: RetailerReadiness = {
  id: "test-retailer", name: "Test retailer", active: true, program_id: "test-program",
  program_status: "approved", program_current: true, tracking_configured: true,
  products: 1, reviewed_matches: 1, saved_links: 1, checked_links: 1,
  public_offers: 0, public_retailer_links: 0, samples: [],
};
const linkId = "ea340000-0000-4000-8000-000000000111";
describe("affiliate launch readiness", () => {
  it.each([
    [{ program_current: false, active: false, products: 0 }, "applications", "approval"],
    [{ active: false }, "retailers", "activate"],
    [{ tracking_configured: false }, "retailers", "tracking"],
    [{ products: 0 }, "matching", "authorized product"],
    [{ reviewed_matches: 0 }, "matching", "Review"],
    [{ checked_links: 0 }, "matching", "permitted link check"],
    [{}, "matching", "public eligibility"],
    [{ program_id: "kc-tool-refersion", products: 0 }, "matching", "without a product identity"],
  ] as const)("identifies the next missing dependency: %j", (patch, section, text) => {
    const next = nextAffiliateStep({ ...retailer, ...patch });
    expect(next.section).toBe(section);
    expect(next.message).toContain(text);
  });
  it("retains source-position scope in the actual catalog link", () => {
    const url = new URL(affiliateCatalogUrl({ part_id: "bmw-test", scope_position_id: "source:01", link_id: linkId }), "https://e34lore.com");
    expect(url.searchParams.get("part")).toBe("bmw-test");
    expect(url.searchParams.get("position")).toBe("source:01");
  });
  it("does not infer public availability from checked or saved records", () => {
    const html = renderToStaticMarkup(createElement(AffiliateReadinessPanel, {
      data: { checked_at: "2026-11-08T18:15:00Z", retailers: [retailer] }, onSection: () => {},
    }));
    expect(html).toContain("Not live");
    expect(html).toContain("Open product matching");
    expect(html).not.toContain("Public links available");
    expect(html).toContain("does not confirm network attribution");
  });
  it("rejects an incomplete or invalid readiness response", () => {
    expect(affiliateReadinessSchema.safeParse({ checked_at: "invalid", retailers: [retailer] }).success).toBe(false);
    expect(affiliateReadinessSchema.safeParse({ checked_at: "2026-11-08T18:15:00Z", retailers: [{ ...retailer, public_offers: -1 }] }).success).toBe(false);
  });
  it("discloses storefront referrals without inventing product fitment or tracking users", () => {
    const html = renderToStaticMarkup(createElement(RetailerDirectoryPanel, {
      retailers: [{ retailer: "Tool retailer", link_id: linkId }],
    }));
    expect(html).toContain("may earn a commission");
    expect(html).toContain("do not confirm that any product fits your car");
    expect(html).toContain("sponsored nofollow noopener noreferrer");
    expect(html).toContain("opens in a new tab");
    expect(html).not.toContain("count=1");
    expect(html).not.toContain("user_id");
    expect(renderToStaticMarkup(createElement(RetailerDirectoryPanel, { retailers: [] }))).toBe("");
  });
  it("explains a service failure and offers a named retry", () => {
    const html = renderToStaticMarkup(createElement(RetailerLinksUnavailable, { onRetry: () => {} }));
    expect(html).toContain('role="status"');
    expect(html).toContain("Retry retailer links");
    expect(html).not.toContain("No retailers");
  });
});
