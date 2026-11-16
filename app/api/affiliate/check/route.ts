import { commercialRpc } from "../../../../src/lib/commercial-api";
import { checkAffiliateDestination } from "../../../../src/lib/affiliate-link-check";
import { boundedBody } from "../../../../supabase/functions/_shared/request.mjs";
export async function POST(request: Request) {
  const headers = {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  };
  const token = /^Bearer ([A-Za-z0-9._-]{20,8192})$/.exec(
    request.headers.get("authorization") || "",
  )?.[1];
  if (!token)
    return new Response(
      JSON.stringify({ error: "Sign in with an administrator MFA session." }),
      { status: 401, headers },
    );
  try {
    if (Number(request.headers.get("content-length") || 0) > 1000)
      return new Response(JSON.stringify({ error: "Invalid request" }), {
        status: 400,
        headers,
      });
    const text = new TextDecoder("utf-8",{fatal:true}).decode(await boundedBody(request,1000));
    const { linkId } = JSON.parse(text);
    if (
      typeof linkId !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        linkId,
      )
    )
      throw new Error("Invalid link ID");
    const link = await commercialRpc<{
      id: string;
      url: string;
      allowed_hosts: string[];
      updated_at: string;
    } | null>("affiliate_link_for_check", { target_link: linkId }, token);
    if (!link)
      return new Response(JSON.stringify({ error: "Link not found" }), {
        status: 404,
        headers,
      });
    const result = await checkAffiliateDestination(
      link.url,
      link.allowed_hosts,
    );
    await commercialRpc(
      "record_affiliate_link_check",
      {
        target_link: linkId,
        result_status: result,
        expected_updated_at: link.updated_at,
      },
      token,
    );
    return new Response(JSON.stringify({ status: result }), { headers });
  } catch (failure) {
    return new Response(
      JSON.stringify({
        error:
          failure instanceof Error ? failure.message : "Link check unavailable",
      }),
      { status: 400, headers },
    );
  }
}
