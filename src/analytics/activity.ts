import backend, { demoBackend } from "../lib/backend";

export const publicActivityLabels: Readonly<Record<string, string>> = {
  scanner_open: "Opened Part Scanner",
  scanner_capture: "Added a scanner photo",
  scanner_result: "Reached scanner results",
  scanner_confirm: "Saved a scanner result",
  component_select: "Selected a 3D component or catalog part",
  assembly_view: "Opened an assembly or diagram",
  explode: "Used exploded view",
  search: "Ran a site search",
  search_result: "Opened a search result",
  guide_step: "Checked a repair step",
  diagnostic_complete: "Finished a diagnostic flow",
};

const counted = new Set<string>();

/** One increment per action and document, without sending an identity or page URL. */
export function countPublicActivity(action: string) {
  if (demoBackend || typeof window === "undefined" || location.hostname !== "e34lore.com" || !location.pathname ||
      navigator.webdriver || !Object.hasOwn(publicActivityLabels, action)) return;
  const path = location.pathname.replace(/\/$/, "") || "/";
  const e30 = path === "/e30" || path.startsWith("/e30/");
  const page = e30 ? path.slice(4) || "/" : path;
  if (!/^(?:\/|\/(?:scanner|workshop|quick-reference|parts(?:\/catalog)?|search|diagnostics|guides\/[a-z0-9-]+))$/.test(page)) return;
  const parameters = new URLSearchParams(location.search);
  if (["configuration_revision", "scan", "vehicle", "progress_vehicle"].some((key) => parameters.has(key)) || parameters.get("mode") === "build") return;
  if (action.startsWith("scanner_") && page !== "/scanner") return;
  const key = (e30 ? "e30:" : "e34:") + action;
  if (counted.has(key)) return;
  counted.add(key);
  void fetch(backend.url + "/rest/v1/rpc/record_usage", {
    method: "POST",
    headers: { apikey: backend.publishableKey, "Content-Type": "application/json" },
    body: JSON.stringify({ area_name: key }),
    credentials: "omit",
    referrerPolicy: "no-referrer",
    keepalive: true,
  }).catch(() => {});
}
