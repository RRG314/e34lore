"use client";
import { db } from "../lib/supabase";
import backend from "../lib/backend";
import resources from "./resources.json";
import { countPublicActivity } from "./activity";
import {
  categoryFor,
  normalizeSearch,
  validEvent,
  POLICY_REVISION,
} from "../../supabase/functions/_shared/analytics-contract.mjs";
export { normalizeSearch };
export type Preferences = {
  revision: 2;
  traffic: boolean;
  search: boolean;
  performance: boolean;
};
export const preferenceKey = "e34.analytics.preferences.v2",
  preferenceEvent = "e34-analytics-preferences";
const visitorKey = "e34.analytics.browser.v2";
export const emptyPreferences: Preferences = {
  revision: 2,
  traffic: false,
  search: false,
  performance: false,
};
export function preferences(): Preferences {
  try {
    const p = JSON.parse(localStorage.getItem(preferenceKey) || "null");
    return p?.revision === 2
      ? {
          revision: 2,
          traffic: p.traffic === true,
          search: p.traffic === true && p.search === true,
          performance: p.traffic === true && p.performance === true,
        }
      : emptyPreferences;
  } catch {
    return emptyPreferences;
  }
}
export function setPreferences(p: Preferences) {
  stopRecording();
  try {
    localStorage.setItem(preferenceKey, JSON.stringify(p));
    window.dispatchEvent(new Event(preferenceEvent));
  } catch {
    /* Storage denial leaves recording disabled. */
  }
}
const registry = new Map(resources.map((r) => [r.id, r]));
export function publicResource(href: string): string | null {
  try {
    const url = new URL(href, location.origin);
    if (
      url.origin !== location.origin ||
      url.searchParams.has("configuration_revision")
    )
      return null;
    const path = url.pathname.replace(/\/$/, "") || "/";
    if (path === "/parts" || path === "/e30/parts") return path + "/catalog";
    if (registry.has(path)) return path;
    if (/^\/builds\/[0-9a-f-]{36}$/.test(path)) return "/builds";
    if (/^\/community\/[0-9a-f-]{36}$/.test(path)) return "/community";
    return null;
  } catch {
    return null;
  }
}
export function resourceTarget(href: string) {
  try {
    const u = new URL(href, location.origin);
    if (u.origin !== location.origin) return null;
    const p = u.searchParams.get("part");
    if (
      ["/parts/catalog", "/parts"].includes(u.pathname) &&
      p &&
      /^[a-z0-9-]{1,100}$/i.test(p)
    )
      return "part:" + p;
    return publicResource(href);
  } catch {
    return null;
  }
}
type EventName =
  | "build_open"
  | "build_create"
  | "build_save"
  | "build_customize"
  | "build_compatibility"
  | "build_progress"
  | "build_publish_preview"
  | "build_publish"
  | "build_view"

  | "scanner_open"
  | "scanner_permission"
  | "scanner_capture"
  | "scanner_inference"
  | "scanner_result"
  | "scanner_confirm"
  | "scanner_reject"
  | "scanner_error"
  | "scanner_followup"
  | "page_view"
  | "link_open"
  | "search"
  | "search_result"
  | "component_select"
  | "assembly_view"
  | "explode"
  | "isolate"
  | "guide_step"
  | "guide_save"
  | "diagnostic_step"
  | "diagnostic_complete"
  | "model_loaded"
  | "model_error"
  | "render_error"
  | "web_vital"
  | "js_error"
  | "asset_error"
  | "api_error"
  | "engagement";
export type Fields = {
  target?: string;
  search_id?: string;
  topic?: string;
  results?: number;
  value?: number;
  metric?: "LCP" | "INP" | "CLS";
  model?: string;
  code?:
    | "javascript"
    | "asset"
    | "network"
    | "model"
    | "webgl"
    | "unsupported"
    | "camera-granted"
    | "camera-denied"
    | "camera-unavailable"
    | "ocr"
    | "detector"
    | "embedding"
    | "uncertain";
};
export type AnalyticsEvent = Fields & {
  v: 1;
  id: string;
  page: string;
  name: EventName;
  resource?: string;
  at: number;
  seq: number;
};
type RecordingContext = {
  page: string;
  resource: string;
  visitor: string;
  expires: number;
  engagedMs: number;
  resumed?: boolean;
  consent: Preferences;
  seq: number;
  started: number;
  last: number;
};
let active: RecordingContext | null = null;
let lastView: RecordingContext | null = null;
let queue: AnalyticsEvent[] = [],
  sending = false,
  generation = 0;
function browserId() {
  try {
    const saved = JSON.parse(localStorage.getItem(visitorKey) || "null");
    if (
      saved &&
      typeof saved.id === "string" &&
      /^[0-9a-f-]{36}$/.test(saved.id) &&
      saved.expires > Date.now() &&
      saved.expires <= Date.now() + 31 * 86400000
    )
      return saved.id as string;
    const id = crypto.randomUUID();
    localStorage.setItem(
      visitorKey,
      JSON.stringify({ id, expires: Date.now() + 30 * 86400000 }),
    );
    return id;
  } catch {
    return null;
  }
}
function browserExpiry() {
  try {
    return (
      Number(JSON.parse(localStorage.getItem(visitorKey) || "null")?.expires) ||
      Date.now()
    );
  } catch {
    return Date.now();
  }
}
export function track(name: EventName, resource?: string, fields: Fields = {}) {
  countPublicActivity(name);
  if (
    !active ||
    !active.consent[categoryFor(name) as "traffic" | "search" | "performance"]
  )
    return;
  if (Date.now() >= active.expires || active.seq >= 9000) {
    const previous = active;
    queue = []; // Never attach the previous browser/window's queued events to a new identity.
    const visitor = browserId();
    if (!visitor) {
      stopRecording();
      return;
    }
    active = {
      ...previous,
      resumed: true,
      engagedMs: 0,
      visitor,
      expires: browserExpiry(),
      page: crypto.randomUUID(),
      seq: 0,
      started: Date.now(),
      last: Date.now(),
    };
    lastView = active;
    track("page_view", previous.resource);
  }
  active.last = Date.now();
  if (
    resource &&
    !registry.has(resource) &&
    !/^(part|drawing):[a-z0-9-]{1,100}$/i.test(resource)
  )
    return;
  if (
    fields.target &&
    !registry.has(fields.target) &&
    !/^part:[a-z0-9-]{1,100}$/i.test(fields.target)
  )
    return;
  const e: AnalyticsEvent = {
    v: 1,
    id: crypto.randomUUID(),
    page: active.page,
    name,
    resource,
    at: Date.now(),
    seq: active.seq++,
    ...fields,
  };
  if (validEvent(e) && queue.length < 50) {
    queue.push(e);
    if (queue.length >= 20) void flush();
  }
}
export async function flush(keepalive = false) {
  if (sending || !active || !queue.length) return;
  sending = true;
  const sentGeneration = generation,
    context = active,
    batch = queue.splice(0, 20);
  let recover = false;
  try {
    const session = await db.auth.getSession();
    if (sentGeneration !== generation) return;
    const ua = navigator.userAgent;
    const body = {
      revision: POLICY_REVISION,
      visitor: context.visitor,
      consent: context.consent,
      events: batch,
      device: /iPad|Tablet/i.test(ua)
        ? "tablet"
        : /Mobi|Android|iPhone/i.test(ua)
          ? "mobile"
          : "desktop",
      browser: /Edg\//.test(ua)
        ? "Edge"
        : /Firefox\//.test(ua)
          ? "Firefox"
          : /Chrome\//.test(ua)
            ? "Chrome"
            : /Safari\//.test(ua)
              ? "Safari"
              : "Other",
      referrer: context.resumed
        ? undefined
        : (() => {
            try {
              return new URL(document.referrer).hostname;
            } catch {
              return undefined;
            }
          })(),
      campaign: context.resumed
        ? undefined
        : (() => {
            const c = new URLSearchParams(location.search).get("utm_campaign");
            return c && /^[a-z0-9-]{1,48}$/.test(c) ? c : undefined;
          })(),
    };
    const r = await fetch(backend.url + "/functions/v1/analytics", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: backend.publishableKey,
        ...(session.data.session
          ? { Authorization: "Bearer " + session.data.session.access_token }
          : {}),
      },
      body: JSON.stringify(body),
      keepalive,
      signal: AbortSignal.timeout(6000),
    });
    if (r.ok) {
      const outcome = (await r.json()) as {
        status?: string;
        accepted?: number;
      };
      if (sentGeneration !== generation) return;
      if (
        outcome.status === "page_expired" &&
        outcome.accepted === 0 &&
        sentGeneration === generation &&
        active?.page === context.page
      ) {
        const candidates = [
          ...batch,
          ...queue.filter((e) => e.page === context.page),
        ];
        const meaningful = candidates.some(
          (e) => categoryFor(e.name) !== "performance",
        );
        queue = queue.filter((e) => e.page !== context.page);
        if (meaningful) {
          const pending = candidates.filter(
            (e) =>
              e.name !== "page_view" &&
              Date.now() - e.at < 300000 &&
              active!.consent[
                categoryFor(e.name) as "traffic" | "search" | "performance"
              ],
          );
          active = {
            ...active,
            resumed: true,
            engagedMs: Math.min(
              300000,
              pending
                .filter((e) => e.name === "engagement")
                .reduce((n, e) => n + (e.value || 0), 0),
            ),
            page: crypto.randomUUID(),
            seq: 0,
            started: Date.now(),
            last: Date.now(),
          };
          lastView = active;
          const firstAt = pending.length
            ? Math.min(...pending.map((e) => e.at))
            : Date.now();
          const view: AnalyticsEvent = {
            v: 1,
            id: crypto.randomUUID(),
            page: active.page,
            name: "page_view",
            resource: active.resource,
            at: firstAt,
            seq: active.seq++,
          };
          queue = [
            view,
            ...pending.map((e) => ({
              ...e,
              page: active!.page,
              seq: active!.seq++,
            })),
            ...queue,
          ].slice(0, 50);
          recover = true;
        }
      }
      if (
        outcome.status === "disabled" ||
        outcome.status === "excluded" ||
        outcome.status === "limited" ||
        outcome.status === "erased"
      ) {
        queue = [];
        active = null;
      }
    }
    // No disk queue or indefinite retries. Dedup IDs survive retries for at most one minute.
    else if (
      r.status >= 500 &&
      sentGeneration === generation &&
      batch.every((e) => Date.now() - e.at < 60000)
    )
      queue = [...batch, ...queue].slice(0, 50);
  } catch {
    /* Offline events stay discarded; analytics never blocks navigation. */
  } finally {
    sending = false;
    if (recover) await flush(keepalive);
  }
}
export async function startRecording(path: string, allowed = true) {
  stopRecording();
  const consent = preferences();
  if (
    !allowed ||
    !consent.traffic ||
    ![
      "e34lore.com",
      "www.e34lore.com",
      "e34-collective.sreid1118.chatgpt.site",
    ].includes(location.hostname) ||
    navigator.webdriver
  )
    return () => {};
  const resource = publicResource(path);
  if (!resource) return () => {};
  const currentGeneration = generation;
  const config = await db
    .rpc("analytics_public_config")
    .abortSignal(AbortSignal.timeout(6000));
  if (
    generation !== currentGeneration ||
    config.error ||
    !config.data?.enabled ||
    config.data.revision !== 2
  )
    return () => {};
  const visitor = browserId();
  if (!visitor) return () => {};
  active =
    lastView?.resource === resource && lastView.visitor === visitor
      ? { ...lastView, consent, expires: browserExpiry() }
      : {
          page: crypto.randomUUID(),
          resource,
          visitor,
          expires: browserExpiry(),
          engagedMs: 0,
          consent,
          seq: 0,
          started: Date.now(),
          last: Date.now(),
        };
  lastView = active;
  track("page_view", resource);
  let lastActivity = Date.now(),
    lastTick = Date.now(),
    live = true;
  const activity = () => {
    lastActivity = Date.now();
  };
  const timer = setInterval(() => {
    if (!live) return;
    const now = Date.now(),
      delta = Math.min(20000, now - lastTick);
    lastTick = now;
    if (
      document.visibilityState === "visible" &&
      document.hasFocus() &&
      now - lastActivity < 60000 &&
      active &&
      active.engagedMs < 300000
    ) {
      const value = Math.min(delta, 300000 - active.engagedMs);
      active.engagedMs += value;
      track("engagement", resource, { value });
    }
    void flush();
  }, 20000);
  const hide = () => {
    if (document.visibilityState === "hidden") void flush(true);
  };
  const pagehide = () => {
    void flush(true);
  };
  const click = (event: MouseEvent) => {
    const a = (event.target as Element)?.closest?.("a[href]");
    if (a) {
      const target = resourceTarget(a.getAttribute("href") || "");
      if (target) track("link_open", resource, { target });
    }
  };
  const error = (e: Event) =>
    track(
      e.target instanceof HTMLElement ? "asset_error" : "js_error",
      resource,
      { code: e.target instanceof HTMLElement ? "asset" : "javascript" },
    );
  for (const type of ["pointerdown", "keydown", "scroll"])
    window.addEventListener(type, activity, { passive: true });
  document.addEventListener("click", click);
  document.addEventListener("visibilitychange", hide);
  window.addEventListener("pagehide", pagehide);
  window.addEventListener("error", error, true);
  const rejection = () => track("js_error", resource, { code: "javascript" });
  window.addEventListener("unhandledrejection", rejection);
  if (consent.performance)
    void import("web-vitals")
      .then(({ onCLS, onINP, onLCP }) => {
        const record = (m: { name: string; value: number }) => {
          if (live)
            track("web_vital", resource, {
              metric: m.name as "LCP" | "INP" | "CLS",
              value: Math.max(0, Math.min(300000, m.value)),
            });
        };
        onCLS(record);
        onINP(record);
        onLCP(record);
      })
      .catch(() => {});
  return () => {
    live = false;
    clearInterval(timer);
    for (const type of ["pointerdown", "keydown", "scroll"])
      window.removeEventListener(type, activity);
    document.removeEventListener("click", click);
    document.removeEventListener("visibilitychange", hide);
    window.removeEventListener("pagehide", pagehide);
    window.removeEventListener("error", error, true);
    window.removeEventListener("unhandledrejection", rejection);
    void flush(true);
  };
}
export function stopRecording() {
  generation++;
  active = null;
  queue = [];
}
export async function forgetBrowser() {
  let saved;
  try {
    saved = JSON.parse(localStorage.getItem(visitorKey) || "null");
  } catch {}
  if (saved?.id) {
    const response = await fetch(
      backend.url + "/functions/v1/analytics/forget",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: backend.publishableKey,
        },
        body: JSON.stringify({ visitor: saved.id }),
        signal: AbortSignal.timeout(10000),
      },
    );
    if (!response.ok)
      throw Error(
        "Deletion could not be confirmed. Please try again before clearing browser data.",
      );
  }
  try {
    localStorage.removeItem(visitorKey);
    lastView = null;
  } catch {}
  setPreferences(emptyPreferences);
  stopRecording();
}
