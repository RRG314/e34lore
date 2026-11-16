import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), session: vi.fn() }));
vi.mock("../src/lib/supabase", () => ({
  db: { rpc: mocks.rpc, auth: { getSession: mocks.session } },
}));
import {
  preferences,
  setPreferences,
  emptyPreferences,
  startRecording,
  stopRecording,
  track,
  flush,
  publicResource,
  resourceTarget,
  forgetBrowser,
  preferenceKey,
} from "../src/analytics/client";
class MemoryStorage {
  data = new Map<string, string>();
  getItem(k: string) {
    return this.data.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.data.set(k, String(v));
  }
  removeItem(k: string) {
    this.data.delete(k);
  }
}
let storage: MemoryStorage, net: ReturnType<typeof vi.fn>;
beforeEach(() => {
  storage = new MemoryStorage();
  vi.stubGlobal("localStorage", storage);
  vi.stubGlobal("location", {
    origin: "https://e34lore.com",
    hostname: "e34lore.com",
    search: "",
  });
  vi.stubGlobal("navigator", {
    userAgent: "Mozilla/5.0 Chrome/140.0",
    webdriver: false,
  });
  const doc = Object.assign(new EventTarget(), {
    referrer: "https://forum.example.com/secret?token=PRIVATE",
    visibilityState: "visible",
    hasFocus: () => true,
  });
  vi.stubGlobal("document", doc);
  vi.stubGlobal("window", new EventTarget());
  vi.stubGlobal("HTMLElement", class {});
  mocks.rpc.mockImplementation(() => ({
    abortSignal: () =>
      Promise.resolve({ data: { enabled: true, revision: 2 } }),
  }));
  mocks.session.mockResolvedValue({ data: { session: null } });
  net = vi
    .fn()
    .mockImplementation(
      async () =>
        new Response(JSON.stringify({ accepted: 2, status: "recorded" })),
    );
  vi.stubGlobal("fetch", net);
});
afterEach(() => {
  stopRecording();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  vi.restoreAllMocks();
});
describe("consent-aware client collection", () => {
  it("counts a public action once without including an account or page details", () => {
    Object.assign(location, { pathname: "/e30/workshop", search: "?part=private-input" });
    track("component_select", "node:private-input");
    track("component_select", "node:another-component");
    expect(net).toHaveBeenCalledTimes(1);
    expect(net.mock.calls[0][1]).toMatchObject({
      body: '{"area_name":"e30:component_select"}',
      credentials: "omit",
      referrerPolicy: "no-referrer",
    });
    expect(net.mock.calls[0][1].headers).not.toHaveProperty("Authorization");
    Object.assign(location, { search: "?configuration_revision=private" });
    track("explode");
    Object.assign(location, { pathname: "/e30/scanner", search: "?scan=private" });
    track("scanner_result", "/scanner", { results: 1 });
    expect(net).toHaveBeenCalledTimes(1);
  });
  it("does nothing by default and does not upgrade legacy consent", async () => {
    storage.setItem("e34.usage.enabled", "yes");
    expect(preferences()).toEqual(emptyPreferences);
    await startRecording("/workshop");
    track("component_select", "/workshop");
    await flush();
    expect(net).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(storage.getItem("e34.analytics.browser.v2")).toBeNull();
  });
  it("records only after explicit revision-2 consent and configuration", async () => {
    setPreferences({
      revision: 2,
      traffic: true,
      search: false,
      performance: false,
    });
    const cleanup = await startRecording("/workshop");
    track("explode", "/workshop", { value: 2 });
    track("search", "/search", {
      topic: "vanos",
      results: 0,
      search_id: crypto.randomUUID(),
    });
    track("js_error", "/workshop", { code: "javascript" });
    await flush();
    expect(net).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(net.mock.calls[0][1].body);
    expect(payload.events.map((e: { name: string }) => e.name)).toEqual([
      "page_view",
      "explode",
    ]);
    expect(payload.referrer).toBe("forum.example.com");
    expect(JSON.stringify(payload)).not.toContain("PRIVATE");
    cleanup();
  });
  it("drops queued events immediately when preferences change", async () => {
    setPreferences({
      revision: 2,
      traffic: true,
      search: true,
      performance: false,
    });
    const cleanup = await startRecording("/workshop");
    track("explode", "/workshop", { value: 4 });
    setPreferences(emptyPreferences);
    await flush();
    expect(net).not.toHaveBeenCalled();
    cleanup();
  });
  it("blocks private routes, configuration archives, localhost and QA", async () => {
    setPreferences({
      revision: 2,
      traffic: true,
      search: true,
      performance: true,
    });
    for (const path of [
      "/garage",
      "/account",
      "/support",
      "/manage/analytics",
      "/workshop/assets",
      "/workshop?configuration_revision=private",
    ]) {
      expect(publicResource(path)).toBeNull();
      await startRecording(path);
    }
    vi.stubGlobal("location", {
      origin: "http://127.0.0.1:3002",
      hostname: "127.0.0.1",
      search: "",
    });
    await startRecording("/workshop");
    await flush();
    expect(net).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("does not send events queued while an auth lookup finishes after withdrawal", async () => {
    let finish: (value: unknown) => void = () => {};
    mocks.session.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    setPreferences({
      revision: 2,
      traffic: true,
      search: false,
      performance: false,
    });
    const cleanup = await startRecording("/workshop");
    const task = flush();
    setPreferences(emptyPreferences);
    finish({ data: { session: null } });
    await task;
    expect(net).not.toHaveBeenCalled();
    cleanup();
  });
  it("deletion clears the browser token and consent only after server confirmation", async () => {
    storage.setItem(
      "e34.analytics.browser.v2",
      JSON.stringify({ id: crypto.randomUUID(), expires: Date.now() + 100000 }),
    );
    net.mockResolvedValue(new Response("{}", { status: 503 }));
    await expect(forgetBrowser()).rejects.toThrow("could not be confirmed");
    expect(storage.getItem("e34.analytics.browser.v2")).not.toBeNull();
    net.mockResolvedValue(new Response('{"deleted":true}'));
    await forgetBrowser();
    expect(storage.getItem("e34.analytics.browser.v2")).toBeNull();
    expect(JSON.parse(storage.getItem(preferenceKey)!)).toEqual(
      emptyPreferences,
    );
  });
});

describe("legacy catalog identity compatibility", () => {
  it("maps the existing public parts route without collecting its query", () => {
    expect(publicResource("/parts?assembly=water-pump&q=PRIVATE")).toBe(
      "/parts/catalog",
    );
    expect(publicResource("/parts?configuration_revision=PRIVATE")).toBeNull();
  });
  it("preserves the actual uppercase manual reference identities", async () => {
    const id = "manual-radiator-assembly-m20-m50-A";
    expect(resourceTarget("/parts?part=" + id)).toBe("part:" + id);
    setPreferences({
      revision: 2,
      traffic: true,
      search: false,
      performance: false,
    });
    const cleanup = await startRecording("/parts");
    track("component_select", "part:" + id);
    await flush();
    const payload = JSON.parse(net.mock.calls[0][1].body);
    expect(payload.events.map((e: { resource: string }) => e.resource)).toEqual(
      ["/parts/catalog", "part:" + id],
    );
    cleanup();
  });
});

describe("stable document measurements and authoritative session recovery", () => {
  it("keeps a document identity and sequence when measurement choices change", async () => {
    net.mockImplementation(
      async () =>
        new Response(JSON.stringify({ accepted: 1, status: "recorded" })),
    );
    setPreferences({
      revision: 2,
      traffic: true,
      search: false,
      performance: false,
    });
    const first = await startRecording("/workshop");
    await flush();
    const original = JSON.parse(net.mock.calls[0][1].body).events[0];
    first();
    setPreferences({
      revision: 2,
      traffic: true,
      search: true,
      performance: false,
    });
    const next = await startRecording("/workshop");
    await flush();
    const after = JSON.parse(net.mock.calls[1][1].body).events[0];
    expect(after.page).toBe(original.page);
    expect(after.seq).toBeGreaterThan(original.seq);
    expect(after.id).not.toBe(original.id);
    next();
  });
  it("replays a meaningful action once after server session expiry without changing its event identity", async () => {
    net
      .mockImplementationOnce(
        async () =>
          new Response(JSON.stringify({ accepted: 1, status: "recorded" })),
      )
      .mockImplementationOnce(
        async () =>
          new Response(JSON.stringify({ accepted: 0, status: "page_expired" })),
      )
      .mockImplementation(
        async () =>
          new Response(JSON.stringify({ accepted: 2, status: "recorded" })),
      );
    setPreferences({
      revision: 2,
      traffic: true,
      search: false,
      performance: false,
    });
    const done = await startRecording("/workshop");
    await flush();
    track("explode", "/workshop", { value: 2 });
    await flush();
    expect(net).toHaveBeenCalledTimes(3);
    const before = JSON.parse(net.mock.calls[1][1].body),
      after = JSON.parse(net.mock.calls[2][1].body);
    expect(after.events.map((e: { name: string }) => e.name)).toEqual([
      "page_view",
      "explode",
    ]);
    expect(after.events[1].id).toBe(before.events[0].id);
    expect(after.events[1].page).not.toBe(before.events[0].page);
    expect(after.referrer).toBeUndefined();
    expect(after.campaign).toBeUndefined();
    done();
  });
  it("does not manufacture a resumed visit from a late passive failure", async () => {
    net
      .mockImplementationOnce(
        async () =>
          new Response(JSON.stringify({ accepted: 1, status: "recorded" })),
      )
      .mockImplementation(
        async () =>
          new Response(JSON.stringify({ accepted: 0, status: "page_expired" })),
      );
    setPreferences({
      revision: 2,
      traffic: true,
      search: false,
      performance: true,
    });
    const done = await startRecording("/workshop");
    await flush();
    track("model_error", "/workshop", { code: "model" });
    await flush();
    expect(net).toHaveBeenCalledTimes(2);
    done();
  });
  it("expires the browser identifier even if a document stays open longer than 30 days", async () => {
    net.mockImplementation(
      async () =>
        new Response(JSON.stringify({ accepted: 1, status: "recorded" })),
    );
    setPreferences({
      revision: 2,
      traffic: true,
      search: false,
      performance: false,
    });
    const done = await startRecording("/workshop");
    await flush();
    const before = JSON.parse(net.mock.calls[0][1].body);
    track("explode", "/workshop", { value: 0.5 });
    const clock = vi
      .spyOn(Date, "now")
      .mockReturnValue(Date.now() + 31 * 86400000);
    track("explode", "/workshop", { value: 1 });
    await flush();
    const after = JSON.parse(net.mock.calls[1][1].body);
    expect(after.visitor).not.toBe(before.visitor);
    expect(after.events[0].name).toBe("page_view");
    expect(
      after.events
        .filter((e: { name: string }) => e.name === "explode")
        .map((e: { value: number }) => e.value),
    ).toEqual([1]);
    clock.mockRestore();
    done();
  });
});

describe("stale collector responses", () => {
  it("does not clear newly permitted recording when an earlier request finishes excluded", async () => {
    let finish: (r: Response) => void = () => {};
    net
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finish = resolve;
          }),
      )
      .mockImplementation(
        async () =>
          new Response(JSON.stringify({ accepted: 2, status: "recorded" })),
      );
    setPreferences({
      revision: 2,
      traffic: true,
      search: false,
      performance: false,
    });
    const oldStop = await startRecording("/workshop");
    const old = flush();
    await vi.waitFor(() => expect(net).toHaveBeenCalledTimes(1));
    setPreferences({
      revision: 2,
      traffic: true,
      search: true,
      performance: false,
    });
    oldStop();
    const done = await startRecording("/workshop");
    finish(new Response(JSON.stringify({ accepted: 0, status: "excluded" })));
    await old;
    track("explode", "/workshop", { value: 1 });
    await flush();
    expect(net).toHaveBeenCalledTimes(2);
    expect(JSON.parse(net.mock.calls[1][1].body).consent.search).toBe(true);
    done();
  });
});
