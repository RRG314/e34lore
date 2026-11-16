import { boundedBody, RequestBodyError, activeVerifiedSession } from "../_shared/request.mjs";
export function accountResponse(request,status,body,allowedOrigins){const origin=request.headers.get("origin");return new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json","Cache-Control":"no-store",...(origin&&allowedOrigins.includes(origin)?{"Access-Control-Allow-Origin":origin,Vary:"Origin"}:{})}});}
export async function deleteAccount(request, admin, allowedOrigins) {
  const origin = request.headers.get("origin");
  const headers = {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
    "Access-Control-Allow-Headers":
      "authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    ...(origin && allowedOrigins.includes(origin)
      ? { "Access-Control-Allow-Origin": origin, Vary: "Origin" }
      : {}),
  };
  const response = (status, body) =>
    new Response(JSON.stringify(body), { status, headers });
  if (origin && !allowedOrigins.includes(origin))
    return response(403, { error: "Origin is not permitted." });
  if (request.method === "OPTIONS")
    return new Response(null, { status: 204, headers });
  if (request.method !== "POST") return response(405, { error: "Use POST." });
  const token = request.headers
    .get("authorization")
    ?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token)
    return response(401, { error: "Sign in before deleting your account." });
  let input;
  try {
    const text = new TextDecoder("utf-8", {fatal:true}).decode(await boundedBody(request,1024));
    input = JSON.parse(text);
  } catch (error) {
    return response(error instanceof RequestBodyError ? error.status : 400, { error: error instanceof RequestBodyError ? error.message : "Invalid confirmation." });
  }
  if (
    input?.confirm !== "DELETE_MY_ACCOUNT" ||
    Object.keys(input).some((k) => k !== "confirm")
  )
    return response(400, {
      error: "Explicit account-deletion confirmation is required.",
    });
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user)
    return response(401, {
      error: "Your session is no longer valid. Sign in again.",
    });
  // Identity comes exclusively from a fresh Auth-server lookup, never client input.
  const userId = data.user.id;
  if (!await activeVerifiedSession(admin, token, userId)) return response(401, {error:"Your session has ended. Sign in again before deleting your account."});
  const signedOut = await admin.auth.admin.signOut(token, "global");
  if (signedOut.error)
    return response(503, {
      error:
        "Sessions could not be revoked. No account was deleted. Try again.",
    });
  // Remove all owned source uploads, including uploads without evidence rows.
  // Metadata lookup is service-role only; the target is the freshly authenticated user.
  for (const [lookup,bucket] of [["account_twin_file_paths","e34-twin-submissions"],["account_car_file_paths","e34-car-photos"]]) {
  let cursor = "";
  while (true) {
    const files = await admin.rpc(lookup, {
      target_user_id: userId,
      after_path: cursor,
    });
    if (files.error)
      return response(503, {
        error:
          "Source upload cleanup could not be checked. Sign in again and retry.",
      });
    const paths = (files.data || []).map((row) => row.path);
    if (!paths.length) break;
    const removed = await admin.storage
      .from(bucket)
      .remove(paths);
    if (removed.error)
      return response(503, {
        error:
          "Some source uploads could not be removed. Sign in again and retry account deletion.",
      });
    cursor = paths[paths.length - 1];
  }
  }
  const deleted = await admin.auth.admin.deleteUser(userId);
  if (deleted.error)
    return response(503, {
      error:
        "Deletion did not complete. Sign in again and retry or contact the site owner.",
    });
  return response(200, { deleted: true });
}
