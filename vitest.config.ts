import { configDefaults, defineConfig } from "vitest/config";
import { siteContent } from "./scripts/site-content.mjs";

// These suites verify exact bytes and fit on separately supplied release assets.
const releaseSuites = [
  "525i-mechanical-candidate",
  "525i-service-candidate",
  "525i-visual-candidate",
  "component-catalog",
  "component-coverage",
  "explosion",
  "paint-surfaces",
  "public-workshop",
  "reference-catalog-integrity",
  "workshop-variants",
];

export default defineConfig({
  define: {
    __E34_BROWSER_BACKEND__: JSON.stringify({
      mode: "local",
      url: "http://127.0.0.1:54321",
      publishableKey: "test-only",
    }),
  },
  test: {
    include: ["tests/**/*.test.{ts,tsx}"],
    exclude: [
      ...configDefaults.exclude,
      ...(siteContent().release ? [] : releaseSuites.map(name => `tests/${name}.test.ts`)),
    ],
    environment: "node",
  },
});
