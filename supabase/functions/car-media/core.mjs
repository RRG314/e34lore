import { boundedBody, RequestBodyError } from "../_shared/request.mjs";
import { sanitizeJpeg, MAX_BYTES } from "./image.mjs";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function carMedia(request, { admin, userClient, codec, origins }) {
  const origin = request.headers.get("origin");
  const headers = {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
    "Access-Control-Allow-Headers":
      "authorization,apikey,content-type,x-client-info",
    "Access-Control-Allow-Methods": "POST,OPTIONS",
    ...(origin && origins.includes(origin)
      ? { "Access-Control-Allow-Origin": origin, Vary: "Origin" }
      : {}),
  };
  const reply = (status, body) =>
    new Response(JSON.stringify(body), { status, headers });
  if (origin && !origins.includes(origin))
    return reply(403, { error: "Origin is not permitted." });
  if (request.method === "OPTIONS")
    return new Response(null, { status: 204, headers });
  if (request.method !== "POST") return reply(405, { error: "Use POST." });
  const token = request.headers
    .get("authorization")
    ?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return reply(401, { error: "Sign in to manage car photos." });
  const identity = await admin.auth.getUser(token);
  const user = identity.data?.user;
  if (identity.error || !user) return reply(401, { error: "Sign in again." });
  const scoped = userClient(token);
  async function readBody(limit) {
    try { return await boundedBody(request, limit); }
    catch (error) { if (error instanceof RequestBodyError && error.status === 413) return null; throw error; }
  }
  async function cleanup() {
    let removed = 0;
    for (let i = 0; i < 4; i++) {
      const q = await admin.rpc("car_media_cleanup_paths", {
        target_user_id: user.id,
      });
      if (q.error) throw new Error("Photo cleanup could not be checked.");
      const paths = (q.data || []).map((r) => r.path);
      if (!paths.length) break;
      const result = await admin.storage.from("e34-car-photos").remove(paths);
      if (result.error) throw new Error("Photo cleanup needs another attempt.");
      const done = await admin.rpc("finish_car_media_cleanup", {
        target_user_id: user.id,
        paths,
      });
      if (done.error)
        throw new Error("Photo cleanup receipt could not be saved.");
      removed += paths.length;
    }
    return removed;
  }
  if (request.headers.get("content-type")?.startsWith("application/json")) {
    let input;
    try {
      const bytes = await readBody(1024);
      if (!bytes) return reply(413, { error: "Request is too large." });
      input = JSON.parse(new TextDecoder().decode(bytes));
      if (!input || typeof input !== "object") throw new Error();
    } catch {
      return reply(400, { error: "Invalid request." });
    }
    if (input.action === "cleanup")
      return reply(200, { removed: await cleanup() });
    if (input.action !== "delete" || !uuid.test(input.photo || ""))
      return reply(400, { error: "Choose a photo." });
    const found = await scoped
      .from("owner_car_photos")
      .select("id,build_project_id")
      .eq("id", input.photo)
      .eq("user_id", user.id)
      .maybeSingle();
    if (found.error || !found.data)
      return reply(404, { error: "Photo unavailable." });
    if (found.data.build_project_id) {const session=await scoped.rpc("build_media_session");if(session.error||session.data!==true)return reply(403,{error:"Sign in again before managing build photos."});}
    // Remove the database source first; triggers immediately revoke public access and queue the file.
    const gone = await admin
      .from("owner_car_photos")
      .delete()
      .eq("id", input.photo)
      .eq("user_id", user.id);
    if (gone.error) return reply(503, { error: "Photo could not be removed." });
    try {
      await cleanup();
      return reply(200, { deleted: true });
    } catch {
      return reply(200, { deleted: true, cleanup_pending: true });
    }
  }
  if (!user.email_confirmed_at)
    return reply(403, { error: "Confirm your email before uploading." });
  if (!request.headers.get("content-type")?.startsWith("multipart/form-data"))
    return reply(415, { error: "Choose a photo." });
  // Bound the stream before FormData parsing, including clients without Content-Length.
  const buffer = await readBody(MAX_BYTES + 16384);
  if (!buffer) return reply(413, { error: "Photo is too large." });
  if (!buffer.length) return reply(400, { error: "Photo is missing." });
  let form;
  try {
    form = await new Response(buffer, {
      headers: { "Content-Type": request.headers.get("content-type") },
    }).formData();
  } catch {
    return reply(400, { error: "Invalid photo form." });
  }
  const file = form.get("photo"),
    vehicle = String(form.get("vehicle") || ""), project=String(form.get("project")||"");
  if (
    !(file instanceof Blob) ||
    file.type !== "image/jpeg" ||
    file.size > MAX_BYTES ||
    (!uuid.test(vehicle)&&!uuid.test(project))||(vehicle&&project)
  )
    return reply(400, { error: "Choose a car and a JPEG photo under 2 MB." });
  const caption = String(form.get("caption") || ""),
    alt = String(form.get("alt") || "");
  if (
    caption.length > 400 ||
    alt.trim().length < 5 ||
    alt.length > 240 ||
    form.get("rights") !== "true"
  )
    return reply(400, {
      error: "Add a photo description and confirm permission to share it.",
    });
  const reservation = await scoped.rpc(project?"reserve_build_photo":"reserve_car_photo", {
    ...(project?{project}:{vehicle}),
    caption_text: caption,
    alternative_text: alt,
    rights_confirmed: true,
  });
  if (reservation.error)
    return reply(400, { error: reservation.error.message });
  const photo = Array.isArray(reservation.data)
    ? reservation.data[0]
    : reservation.data;
  if (!photo?.id || !photo?.object_path)
    return reply(503, { error: "Upload reservation failed." });
  // Retry this account’s already-authorized, durable cleanup work during subsequent uploads.
  try { await cleanup(); } catch { /* Deletion metadata already revokes reads; retain the cleanup receipt. */ }
  let clean;
  try {
    clean = sanitizeJpeg(new Uint8Array(await file.arrayBuffer()), codec);
  } catch {
    await admin.from("owner_car_photos").delete().eq("id", photo.id).eq("user_id", user.id);
    return reply(422, {
      error:
        "This photo could not be decoded safely. Choose a different image.",
    });
  }
  const uploaded = await admin.storage
    .from("e34-car-photos")
    .upload(photo.object_path, clean.bytes, {
      contentType: "image/jpeg",
      cacheControl: "0",
      upsert: false,
    });
  if (uploaded.error) {
    await admin
      .from("owner_car_photos")
      .delete()
      .eq("id", photo.id)
      .eq("user_id", user.id);
    return reply(503, { error: "Photo upload failed. Try again." });
  }
  const hash = Array.from(
    new Uint8Array(await crypto.subtle.digest("SHA-256", clean.bytes)),
  )
    .map((v) => v.toString(16).padStart(2, "0"))
    .join("");
  const completed = await admin.rpc("complete_car_photo", {
    actor: user.id,
    photo: photo.id,
    pixel_width: clean.width,
    pixel_height: clean.height,
    byte_count: clean.bytes.length,
    content_hash: hash,
  });
  if (completed.error) {
    await admin
      .from("owner_car_photos")
      .delete()
      .eq("id", photo.id)
      .eq("user_id", user.id);
    try {
      await cleanup();
    } catch {}
    return reply(503, { error: "Photo could not be saved. Try again." });
  }
  return reply(201, {
    id: photo.id,
    width: clean.width,
    height: clean.height,
    bytes: clean.bytes.length,
  });
}
