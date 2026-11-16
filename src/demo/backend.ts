import { demoCatalog } from "./catalog";

const fixtures = Object.values(demoCatalog);
const tables: Record<string, object[]> = {
  catalog_inventory: fixtures.map(f => f.context),
  assemblies: fixtures.map(f => f.assembly),
  parts: fixtures.map(f => f.part),
  part_assembly_positions: fixtures.map(f => f.position),
  technical_drawings: fixtures.map(f => f.drawing),
};
const searches = new Set(["catalog_search_parts", "catalog_find_parts", "catalog_find_series_parts"]);
const emptyQueries = new Set([
  "approved_part_photos", "browse_community", "browse_garage_entries",
  "public_advertisements", "public_affiliate_offers", "public_affiliate_retailers",
]);

function getField(row: object, field: string): unknown {
  return field.split(".").reduce<unknown>((value, key) =>
    value && typeof value === "object" ? (value as Record<string, unknown>)[key] : undefined, row);
}

function matchRows(rows: object[], filters: URLSearchParams) {
  return rows.filter(row => [...filters].every(([field, filter]) => {
    if (["select", "order", "limit", "offset"].includes(field)) return true;
    const value = getField(row, field);
    if (filter.startsWith("eq.")) return String(value) === filter.slice(3);
    if (filter.startsWith("like.")) return String(value || "").endsWith(filter.slice(5).replace(/^%/, ""));
    if (filter.startsWith("ilike.")) {
      return String(value || "").toLowerCase().includes(filter.slice(6).replaceAll("%", "").toLowerCase());
    }
    if (filter.startsWith("in.(") && filter.endsWith(")")) {
      return filter.slice(4, -1).split(",").includes(String(value));
    }
    return false;
  }));
}

// This adapter supplies public example rows to the same client used by the app.
// It never forwards a request or creates an account/session.
export const demoFetch: typeof fetch = async (input, init) => {
  const request = new Request(input, init);
  request.signal.throwIfAborted();
  const url = new URL(request.url);
  const reply = (data: unknown, status = 200) => Response.json(data, { status });
  const denied = () => reply({ message: "This action needs a local Supabase instance." }, 403);
  if (url.origin !== "https://demo.invalid") return denied();
  if (request.method === "GET" && url.pathname === "/auth/v1/settings") {
    return reply({ external: { email: false, anonymous_users: false }, disable_signup: true });
  }
  if (request.method === "GET" && url.pathname.startsWith("/rest/v1/")) {
    const rows = matchRows(tables[url.pathname.slice(9)] || [], url.searchParams);
    const [first, last] = (request.headers.get("range") || "").split("-").map(Number);
    const from = Number(url.searchParams.get("offset") || first || 0);
    const limit = Number(url.searchParams.get("limit") || (Number.isInteger(last) ? last - from + 1 : rows.length));
    const result = rows.slice(from, from + limit);
    if (request.headers.get("accept")?.includes("vnd.pgrst.object")) {
      return result.length === 1 ? reply(result[0]) : reply({ message: "Expected one record." }, 406);
    }
    return reply(result);
  }
  if (request.method === "POST" && url.pathname.startsWith("/rest/v1/rpc/")) {
    const name = url.pathname.slice(13);
    if (searches.has(name)) {
      const payload = await request.json().catch(() => null);
      const data = payload && typeof payload === "object" ? payload as Record<string, unknown> : {};
      const search = typeof data.search_query === "string"
        ? data.search_query.toLowerCase().match(/[a-z0-9]+/g) || [] : [];
      const rows = fixtures.filter(f => (!data.context_filter || data.context_filter === f.context.id)
        && (!data.series_filter || data.series_filter === f.context.series)
        && search.every(word => (f.part.name.toLowerCase() + " " + f.entry.number).includes(word)));
      return reply(rows.map(f => f.hit));
    }
    if (name === "community_member_count") return reply(0);
    if (name === "scanner_runtime_config") return reply({ visual_available: false, public_visual_enabled: false });
    if (name === "analytics_public_config") return reply({ enabled: false });
    if (emptyQueries.has(name)) return reply([]);
  }
  return denied();
};
