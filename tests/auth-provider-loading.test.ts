import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); vi.resetModules(); });

describe("sign-in provider loading", () => {
  it("shares a lookup across simultaneous guest and social consumers", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ external: { google: true, anonymous_users: true } })));
    vi.stubGlobal("fetch", fetcher);
    const { loadAuthProviders } = await import("../src/lib/auth-providers");
    const [social, guest] = await Promise.all([loadAuthProviders(), loadAuthProviders()]);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(social.google).toBe(true); expect(guest.anonymous_users).toBe(true);
  });
  it("recovers after a failed lookup instead of caching unavailable providers", async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(new Response("Unavailable", { status: 503 })).mockResolvedValueOnce(new Response(JSON.stringify({ external: { apple: true } })));
    vi.stubGlobal("fetch", fetcher);
    const { loadAuthProviders } = await import("../src/lib/auth-providers");
    await expect(loadAuthProviders()).rejects.toThrow();
    expect((await loadAuthProviders()).apple).toBe(true);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it("aborts a stalled lookup and allows a later attempt", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn((_url, options) => new Promise((_resolve, reject) => {
      options.signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
    })));
    const { loadAuthProviders } = await import("../src/lib/auth-providers");
    const result = expect(loadAuthProviders()).rejects.toMatchObject({ name: "AbortError" });
    await vi.advanceTimersByTimeAsync(10_000); await result;
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ external: { facebook: true } }))));
    expect((await loadAuthProviders()).facebook).toBe(true);
  });
});
