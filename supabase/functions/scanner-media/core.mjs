import { boundedBody, RequestBodyError, activeVerifiedSession } from "../_shared/request.mjs";
import { sanitizeJpeg, MAX_BYTES } from "../car-media/image.mjs";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function scannerMedia(request, { admin, userClient, codec, origins }) {
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
  if (!token) return reply(401, { error: "Sign in to manage part photos." });
  const identity = await admin.auth.getUser(token);
  const user = identity.data?.user;
  if (identity.error || !user) return reply(401, { error: "Sign in again." });
  if(user.is_anonymous) return reply(403,{error:"Sign in with a verified account to save photos."});
  if(!await activeVerifiedSession(admin,token,user.id))return reply(401,{error:"Your session has ended. Sign in again."});
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
  async function discard(photo){
    await admin.from('observation_photos').delete().eq('id',photo.id).eq('user_id',user.id);
    // A concurrent owner deletion may already have consumed the original cleanup receipt.
    const queued=await admin.rpc('queue_observation_photo_cleanup',{actor:user.id,photo:photo.id});
    if(queued.error){await admin.storage.from('e34-car-photos').remove([photo.object_path]);throw Error('Photo cleanup receipt could not be saved.');}
    try{await cleanup()}catch{/* Private reads are already revoked; the durable queue retains failed file cleanup. */}
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
      .from("observation_photos")
      .select("id")
      .eq("id", input.photo)
      .eq("user_id", user.id)
      .maybeSingle();
    if (found.error || !found.data)
      return reply(404, { error: "Photo unavailable." });
    // Remove the database source first; triggers immediately revoke public access and queue the file.
    const gone = await admin
      .from("observation_photos")
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
    observation = String(form.get("observation") || "");
  if (
    !(file instanceof Blob) ||
    file.type !== "image/jpeg" ||
    file.size > MAX_BYTES ||
    !uuid.test(observation)
  )
    return reply(400, { error: "Choose a saved scan and a JPEG photo under 2 MB." });
  const clientKey=String(form.get("client_key")||""),share=form.get("share_reference")==="true",consent=String(form.get("consent_revision")||"");
  const view=form.get('view')??'unspecified';
  if(!/^[a-zA-Z0-9:_-]{1,100}$/.test(clientKey)||!['true','false'].includes(String(form.get('share_reference')))||!['unspecified','front','back','side','detail'].includes(view))return reply(400,{error:'Invalid photo details.'});
  const reservation=await scoped.rpc('reserve_observation_photo',{observation,client_key:clientKey,share_reference:share,consent,photo_view:view});
  if(reservation.error)return reply(400,{error:reservation.error.message});
  const photo=Array.isArray(reservation.data)?reservation.data[0]:reservation.data;
  if(!photo?.id||!photo.object_path)return reply(503,{error:'Photo could not be reserved. Try again.'});
  let clean;
  try{clean=sanitizeJpeg(new Uint8Array(await file.arrayBuffer()),codec)}catch{if(photo.state!=='ready')await discard(photo);return reply(422,{error:'This photo could not be read safely. Choose another image.'})}
  const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',clean.bytes)),v=>v.toString(16).padStart(2,'0')).join('');
  if(photo.state==='ready')return photo.sha256===hash?reply(200,{id:photo.id,already_saved:true}):reply(409,{error:'This saved photo differs. Start a new scan for a different photo.'});
  const uploaded = await admin.storage
    .from("e34-car-photos")
    .upload(photo.object_path, clean.bytes, {
      contentType: "image/jpeg",
      cacheControl: "0",
      upsert: false,
    });
  if(uploaded.error){await discard(photo);return reply(503,{error:'Photo upload failed. Try again.'});}
  const completed = await admin.rpc("complete_observation_photo", {
    actor: user.id,
    photo: photo.id,
    pixel_width: clean.width,
    pixel_height: clean.height,
    byte_count: clean.bytes.length,
    content_hash: hash,
  });
  if(completed.error){await discard(photo);return reply(503,{error:'Photo could not be saved. Try again.'});}
  try{await cleanup()}catch{/* Stale files remain in the durable queue for a later cleanup request. */}
  return reply(201, {
    id: photo.id,
    width: clean.width,
    height: clean.height,
    bytes: clean.bytes.length,
  });
}
