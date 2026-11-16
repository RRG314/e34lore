import deployedBackend from "../data/backend.json";

interface BrowserBackend {
  url: string;
  publishableKey: string;
}

declare const __E34_BROWSER_BACKEND__: BrowserBackend | null;

export default (typeof __E34_BROWSER_BACKEND__ === "undefined" ? null : __E34_BROWSER_BACKEND__)
  ?? deployedBackend;
