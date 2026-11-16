interface BrowserBackend {
  mode: "demo" | "local" | "production";
  url: string;
  publishableKey: string;
}

declare const __E34_BROWSER_BACKEND__: BrowserBackend;
declare const __E34_DEMO_ASSETS__: boolean;

const fallback: BrowserBackend = {
  mode: "demo",
  url: "https://demo.invalid",
  publishableKey: "demo-read-only",
};

const backend = typeof __E34_BROWSER_BACKEND__ === "undefined" ? fallback : __E34_BROWSER_BACKEND__;
export const demoAssets = typeof __E34_DEMO_ASSETS__ !== "undefined" && __E34_DEMO_ASSETS__;
export const demoBackend = backend.mode === "demo";
export default backend;
