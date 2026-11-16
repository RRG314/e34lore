import { commercialRpc } from "../../../src/lib/commercial-api";
import { publicHttpsUrl } from "../../../src/domain/affiliates";
const headers = {
  "Cache-Control": "no-store",
  "Referrer-Policy": "no-referrer",
  "X-Robots-Tag": "noindex, nofollow",
};
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
  )
    return new Response("Retailer link unavailable.", { status: 404, headers });
  try {
    const target = await commercialRpc<{
      url: string;
      allowed_host: string;
    } | null>("resolve_affiliate_link", { link_id: id });
    if (!target || !publicHttpsUrl(target.url, [target.allowed_host]))
      return new Response(
        "This retailer link is unavailable. Return to the part reference for current options.",
        { status: 404, headers },
      );
    if (new URL(request.url).searchParams.get("count") === "1") {
      try {
        await commercialRpc(
          "record_affiliate_click",
          { link_id: id },
          undefined,
          AbortSignal.timeout(1500),
        );
      } catch {
        /* A counter failure must not block an approved link. */
      }
    }
    return new Response(null, {
      status: 302,
      headers: { ...headers, Location: target.url },
    });
  } catch {
    return new Response(
      "The retailer link service is temporarily unavailable.",
      { status: 503, headers },
    );
  }
}
