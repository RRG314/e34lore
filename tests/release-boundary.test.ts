import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { featuresFor, heldRoute,releasedSocialProvider } from "../src/release/features";
import { OemNavigation, oemSections } from "../src/components/OemNavigation";

describe("owner's local-first release boundary", () => {
  it('does not release an unverified social provider merely because its backend flag is enabled',()=>{expect(releasedSocialProvider('google')).toBe(true);for(const provider of ['apple','facebook','github','discord','azure','unknown'])expect(releasedSocialProvider(provider)).toBe(false);});
  it.each(["production", "test", "preview", "", undefined])("holds unaccepted features in %s", environment => {
    expect(Object.values(featuresFor(environment))).toEqual([true, false, false, false]);
    for (const path of [["workshop", "repair"], ["garage", "configuration"]]) {
      expect(heldRoute(path, environment)).toBe(true);
    }
    expect(heldRoute(['scanner'],environment)).toBe(false);
    expect(heldRoute(['workshop','repair'],environment,'center-support-bearing')).toBe(false);
    expect(heldRoute(['workshop','repair'],environment,'m50-water-pump-job-planning')).toBe(true);
  });
  it("retains local testing without enabling a production query-string bypass", () => {
    expect(Object.values(featuresFor("development"))).toEqual([true, true, true, true]);
    expect(heldRoute(["scanner"], "development")).toBe(false);
    expect(featuresFor('production?preview=true').scannerExperiments).toBe(false);
    expect(heldRoute(["workshop","repair"], "production?preview=true")).toBe(true);
  });
  it("keeps normal accounts, garage, written guides, OEM records and the existing workshop available", () => {
    for (const path of [[], ["garage"], ["account"], ["guides", "m50-water-pump-job-planning"], ["parts", "catalog"], ["parts", "interchange"], ["workshop"], ["manage", "scanner"]]) {
      expect(heldRoute(path, "production")).toBe(false);
    }
  });
});
describe("OEM navigation", () => {
  it.each(["catalog", "interchange", "reference"])("keeps %s in the same OEM section with one active destination", section => {
    const html = renderToStaticMarkup(createElement(OemNavigation, {section}));
    expect(html).toContain('aria-label="OEM reference sections"');
    expect(html.match(/aria-current="page"/g)).toHaveLength(1);
    expect(html).toContain(`href="/parts/${section}" aria-current="page"`);
    expect(oemSections.every(item => item.href.startsWith("/parts/"))).toBe(true);
  });
});
