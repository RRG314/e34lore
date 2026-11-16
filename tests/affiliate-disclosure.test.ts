import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect } from "vitest";
import { WhereToBuyPanel, type Offer } from "../src/components/Commercial";
import { affiliateDisclosure } from "../src/domain/affiliates";
const offer: Offer = {
  id: "offer",
  link_id: "ea340000-0000-4000-8000-000000000111",
  retailer: "Test retailer",
  title: "Reviewed test seal",
  matched_identifier: "11511711484",
  kind: "conditional",
  compatibility_notes:
    "Conditional source evidence; confirm the installed configuration.",
  source_url: "https://parts.example/evidence",
  match_reviewed_at: "2026-11-07T00:00:00Z",
  price_cents: null,
  currency: "USD",
  availability: null,
  price_observed_at: null,
  shipping_information: null,
  image_url: "https://parts.example/image.jpg",
};
describe("retailer offer disclosure", () => {
  it("renders the disclosure with the actual offer and retains conditional scope", () => {
    const html = renderToStaticMarkup(
      createElement(WhereToBuyPanel, { offers: [offer], partId: "pump-seal" }),
    );
    expect(html).toContain(affiliateDisclosure);
    expect(html).toContain("Conditional match");
    expect(html).toContain("sponsored nofollow noopener noreferrer");
    expect(html).toContain("See retailer for current price");
    expect(html).not.toContain("?count=1");
    expect(html).not.toContain("image.jpg");
  });
  it("does not insert fake retailers or an empty offer section", () =>
    expect(
      renderToStaticMarkup(
        createElement(WhereToBuyPanel, { offers: [], partId: "pump-seal" }),
      ),
    ).toBe(""));
  it("adds only an anonymous opt-in count flag and no account data", () => {
    const html = renderToStaticMarkup(
      createElement(WhereToBuyPanel, {
        offers: [offer],
        partId: "pump-seal",
        consent: true,
      }),
    );
    expect(html).toContain("?count=1");
    expect(html).not.toContain("user_id");
    expect(html).not.toContain("email=");
  });
});
