import { normalizeSearch } from "../_shared/analytics-contract.mjs";
export const properties = new Set([
  "sc-domain:e34lore.com",
  "https://e34lore.com/",
  "https://www.e34lore.com/",
]);
/** Read-only, final web-search data. Google dates are Pacific, not site UTC days. */
export async function searchConsoleReport({
  property,
  start,
  end,
  accessToken,
  fetcher = fetch,
  knownPages,
}) {
  if (
    !properties.has(property) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(start) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(end) ||
    end < start ||
    (Date.parse(end) - Date.parse(start)) / 86400000 > 89
  )
    throw Error("Invalid E34 Search Console range");
  const endpoint =
    "https://www.googleapis.com/webmasters/v3/sites/" +
    encodeURIComponent(property) +
    "/searchAnalytics/query";
  const rows = [];
  let capped = false;
  for (const dimension of ["date", "query", "page"]) {
    const group = dimension === "date" ? ["date"] : ["date", dimension];
    for (let offset = 0; offset < 2000; offset += 1000) {
      const response = await fetcher(endpoint, {
        method: "POST",
        headers: {
          Authorization: "Bearer " + accessToken,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          startDate: start,
          endDate: end,
          dimensions: group,
          type: "web",
          dataState: "final",
          rowLimit: 1000,
          startRow: offset,
        }),
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok)
        throw Error("Search Console access or provider request failed");
      const data = await response.json();
      if (
        !data ||
        typeof data !== "object" ||
        (data.rows !== undefined && !Array.isArray(data.rows))
      )
        throw Error("Invalid Search Console response");
      const source = data.rows || [];
      for (const r of source) {
        if (
          !Array.isArray(r.keys) ||
          r.keys.length !== group.length ||
          typeof r.keys[0] !== "string" ||
          r.keys[0] < start ||
          r.keys[0] > end ||
          !/^\d{4}-\d{2}-\d{2}$/.test(r.keys[0]) ||
          ![r.clicks, r.impressions, r.position].every(
            (x) => Number.isFinite(x) && x >= 0,
          ) ||
          !Number.isSafeInteger(r.clicks) ||
          !Number.isSafeInteger(r.impressions)
        )
          throw Error("Invalid Search Console metrics");
        let key = "all";
        if (dimension === "query") key = normalizeSearch(r.keys[1]);
        if (dimension === "page") {
          try {
            const u = new URL(r.keys[1]);
            if (
              !["e34lore.com", "www.e34lore.com"].includes(u.hostname) ||
              u.protocol !== "https:" ||
              !knownPages.has(u.pathname)
            )
              continue;
            key = u.pathname;
          } catch {
            continue;
          }
        }
        rows.push({
          day: r.keys[0],
          dimension,
          key,
          clicks: r.clicks,
          impressions: r.impressions,
          position_sum: r.position * r.impressions,
        });
      }
      if (source.length < 1000) break;
      if (offset === 1000) capped = true;
    }
  }
  // Multiple real queries can normalize to the same safe technical topic.
  const merged = new Map();
  for (const r of rows) {
    const key = JSON.stringify([r.day, r.dimension, r.key]),
      old = merged.get(key);
    if (old) {
      old.clicks += r.clicks;
      old.impressions += r.impressions;
      old.position_sum += r.position_sum;
    } else merged.set(key, { ...r });
  }
  return {
    property,
    start,
    end,
    rows: [...merged.values()],
    capped,
    partial_dimensions: true,
    timezone: "America/Los_Angeles",
    search_type: "web",
  };
}
export async function refreshSearchConsole({
  clientId,
  clientSecret,
  refreshToken,
  fetcher = fetch,
}) {
  if (!clientId || !clientSecret || !refreshToken)
    throw Error("Search Console authorization is not configured");
  const response = await fetcher("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw Error("Search Console authorization needs attention");
  const body = await response.json();
  if (typeof body?.access_token !== "string" || body.token_type !== "Bearer")
    throw Error("Search Console authorization failed");
  return body.access_token;
}
