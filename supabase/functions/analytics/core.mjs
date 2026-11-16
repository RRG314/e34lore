import { boundedBody, RequestBodyError } from "../_shared/request.mjs";
import { validEnvelope, UUID } from "../_shared/analytics-contract.mjs";
import {
  searchConsoleReport,
  refreshSearchConsole,
} from "./search-console.mjs";
import { getDomain } from "tldts";
export const origins = [
  "https://e34lore.com",
  "https://www.e34lore.com",
];
export function referrerDomain(value) {
  try {
    const u = new URL("https://" + value);
    if (
      u.hostname !== value ||
      u.port ||
      u.username ||
      u.password ||
      u.pathname !== "/" ||
      u.search ||
      u.hash
    )
      return null;
    if (["accounts.google.com", "appleid.apple.com"].includes(u.hostname))
      return null;
    const d = getDomain(u.hostname, { allowPrivateDomains: false });
    return d &&
      ![
        "e34lore.com",
        "chatgpt.site",
        "googleusercontent.com",
        "supabase.co",
        "accounts.google.com",
        "appleid.apple.com",
      ].includes(d) &&
      !d.split(".").some((x) => x.length > 32)
      ? d
      : null;
  } catch {
    return null;
  }
}
export async function analyticsService(
  request,
  { rpc, identity, isStaff, authorize, providerConfig, knownPages },
) {
  const origin = request.headers.get("origin") || "";
  const headers = {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
    Vary: "Origin",
    ...(origins.includes(origin)
      ? { "Access-Control-Allow-Origin": origin }
      : {}),
  };
  const reply = (body, status = 200) =>
    new Response(JSON.stringify(body), { status, headers });
  if (!origins.includes(origin))
    return reply({ error: "Origin not allowed" }, 403);
  if (request.method === "OPTIONS")
    return new Response(null, {
      status: 204,
      headers: {
        ...headers,
        "Access-Control-Allow-Headers":
          "authorization,apikey,content-type,x-client-info",
        "Access-Control-Allow-Methods": "POST,OPTIONS",
      },
    });
  if (request.method !== "POST")
    return reply({ error: "Method not allowed" }, 405);
  try {
    if (
      !(request.headers.get("content-type") || "").startsWith(
        "application/json",
      )
    )
      return reply({ error: "JSON required" }, 415);
    const body = JSON.parse(
      new TextDecoder().decode(await boundedBody(request, 16384, 4000)),
    );
    if (new URL(request.url).pathname.endsWith("/search-console")) {
      const token = (request.headers.get("authorization") || "").replace(
        /^Bearer /i,
        "",
      );
      if (!authorize || !(await authorize(token)))
        return reply({ error: "Administrator MFA required" }, 403);
      if (
        !providerConfig?.clientId ||
        !providerConfig?.clientSecret ||
        !providerConfig?.refreshToken
      )
        return reply(
          {
            error:
              "Search Console needs dedicated read-only authorization. No Google account credentials have been changed.",
          },
          409,
        );
      if (Object.keys(body).some((k) => !["start", "end"].includes(k)))
        return reply({ error: "Invalid sync request" }, 400);
      const accessToken = await refreshSearchConsole(providerConfig);
      const result = await searchConsoleReport({
        property: providerConfig.property || "sc-domain:e34lore.com",
        start: body.start,
        end: body.end,
        accessToken,
        knownPages,
      });
      await rpc("analytics_gsc_import", { payload: result });
      return reply({
        synced: true,
        rows: result.rows.length,
        capped: result.capped,
      });
    }
    // Forget is available even while paused and is not blocked by bot/staff exclusion.
    if (new URL(request.url).pathname.endsWith("/forget")) {
      if (Object.keys(body).length !== 1 || !UUID.test(body.visitor))
        return reply({ error: "Invalid deletion request" }, 400);
      await rpc("analytics_forget", { browser_id: body.visitor });
      return reply({ deleted: true });
    }
    const ua = request.headers.get("user-agent") || "";
    if (
      !ua ||
      /bot|crawler|spider|headless|playwright|lighthouse|prerender|curl|wget|python|monitor|facebookexternalhit/i.test(
        ua,
      )
    )
      return reply({ accepted: 0, status: "excluded" });
    if (!validEnvelope(body))
      return reply({ error: "Invalid analytics event" }, 400);
    const token = (request.headers.get("authorization") || "").replace(
      /^Bearer /i,
      "",
    );
    if (token && token.split(".").length === 3) {
      let claims;
      try {
        claims = JSON.parse(
          atob(token.split(".")[1].replaceAll("-", "+").replaceAll("_", "/")),
        );
      } catch {
        return reply({ error: "Invalid authorization" }, 401);
      }
      if (claims.sub) {
        const user = await identity(token);
        if (!user) return reply({ error: "Session expired" }, 401);
        if (await isStaff(user.id))
          return reply({ accepted: 0, status: "excluded" });
      }
    }
    body.referrer = referrerDomain(body.referrer) || undefined;
    return reply(
      await rpc("analytics_ingest", { browser_id: body.visitor, batch: body }),
    );
  } catch (error) {
    return reply(
      {
        error:
          error instanceof RequestBodyError
            ? error.message
            : "Analytics could not accept this request",
      },
      error instanceof RequestBodyError
        ? error.status
        : error instanceof SyntaxError
          ? 400
          : 503,
    );
  }
}
