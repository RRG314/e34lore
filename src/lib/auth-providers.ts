import config, { demoBackend } from "./backend";

let cached: Promise<Record<string, boolean>> | null = null;
let expiresAt = 0;

// Sign-in options share one bounded lookup per tab instead of issuing the same
// request separately for social and guest access. A failed lookup can be retried.
export function loadAuthProviders(): Promise<Record<string, boolean>> {
  if (demoBackend) return Promise.resolve({});
  if (!cached || Date.now() >= expiresAt) {
    expiresAt = Date.now() + 60_000;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);
    cached = fetch(config.url + "/auth/v1/settings", {
      headers: { apikey: config.publishableKey }, signal: controller.signal,
    }).then(async response => {
      if (!response.ok) throw new Error("Sign-in options could not be loaded");
      const data = await response.json() as { external?: Record<string, boolean> };
      return data.external || {};
    }).catch(error => { cached = null; throw error; })
      .finally(() => clearTimeout(timer));
  }
  return cached;
}
