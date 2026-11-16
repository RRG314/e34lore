// Disposable local review adapter. Never bundled, deployed, or connected to hosted Supabase.
// PostgREST executes the real migrations/RLS. Auth/Storage transport is a local test fixture.
import { createServer } from "node:http";
import { spawn, execFileSync } from "node:child_process";
import { readFile, writeFile, mkdir, unlink } from "node:fs/promises";
import { randomBytes, createHmac, timingSafeEqual } from "node:crypto";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import codec from "jpeg-js";
import { carMedia } from "../../supabase/functions/car-media/core.mjs";
import { scannerMedia } from "../../supabase/functions/scanner-media/core.mjs";
import {registerReviewWheels} from "./review-wheels.mjs";
import { registerReviewReferences, registerE30ReviewReferences } from "./review-references.mjs";
const socket = process.env.E34_REVIEW_SOCKET,
  pg = process.env.E34_REVIEW_PG;
if (
  process.env.E34_BUILD_REVIEW !== "1" ||
  !/^\/tmp\/e34-security-[\w-]+\/socket$/.test(socket || "") ||
  !pg
)
  throw Error("Requires a disposable local review database");
const root = resolve("work/build-studio/review");
await mkdir(root, { recursive: true, mode: 0o700 });
const secret = randomBytes(48).toString("base64url"),
  port = 54431,
  restPort = 54430;
const users = [1, 2, 3].map((n) => ({
  id: "e34a0000-0000-4000-8000-" + String(n).padStart(12, "0"),
  sid: "e34a0000-0000-4000-9000-" + String(n).padStart(12, "0"),
  email:
    n === 1
      ? "studio-review@example.invalid"
      : n === 2
        ? "studio-other@example.invalid"
        : "studio-moderator@example.invalid",
  aal: n === 3 ? "aal2" : "aal1",
}));
function sql(query) {
  return execFileSync(
    pg + "/psql",
    [
      "-X",
      "-At",
      "-v",
      "ON_ERROR_STOP=1",
      "-h",
      socket,
      "-U",
      "postgres",
      "-d",
      "e34_test",
      "-c",
      query,
    ],
    { encoding: "utf8" },
  ).trim();
}
await registerReviewReferences(sql);
await registerE30ReviewReferences(sql);
registerReviewWheels(sql);
for (const u of users) {
  sql(
    `insert into auth.users(id,email,email_confirmed_at,created_at,is_anonymous)values('${u.id}','${u.email}',now(),now()-interval '3 days',false)on conflict(id)do nothing;insert into auth.sessions(id,user_id,aal)values('${u.sid}','${u.id}','${u.aal}')on conflict(id)do nothing;insert into public.profiles(id,display_name)values('${u.id}','Local Studio Review ${users.indexOf(u) + 1}')on conflict(id)do nothing;`,
  );
}
sql(
  `insert into auth.mfa_factors(user_id,status)select '${users[2].id}','verified' where not exists(select 1 from auth.mfa_factors where user_id='${users[2].id}' and status='verified');insert into e34_private.staff_roles(user_id,role)values('${users[2].id}','moderator')on conflict do nothing;insert into public.owned_vehicles(id,user_id,nickname,model_id,configuration)values('e34a0000-0000-4000-a000-000000000001','${users[0].id}','Local test 525i','525i','{"model":"525i","engine":"M50TU","year":"1994","month":"06","market":"USA","body":"Sedan","transmission":"Automatic","steering":"LHD"}')on conflict(id)do nothing;`,
);
function sign(payload) {
  const head = Buffer.from(
      JSON.stringify({ alg: "HS256", typ: "JWT" }),
    ).toString("base64url"),
    body = Buffer.from(
      JSON.stringify({
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 86400,
        ...payload,
      }),
    ).toString("base64url");
  return (
    head +
    "." +
    body +
    "." +
    createHmac("sha256", secret)
      .update(head + "." + body)
      .digest("base64url")
  );
}
function claims(token) {
  try {
    const [h, b, s] = String(token || "").split("."),
      expected = createHmac("sha256", secret)
        .update(h + "." + b)
        .digest(),
      actual = Buffer.from(s, "base64url");
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected))
      return null;
    const c = JSON.parse(Buffer.from(b, "base64url"));
    return c.exp > Date.now() / 1000 ? c : null;
  } catch {
    return null;
  }
}
const anon = sign({ role: "anon" }),
  service = sign({ role: "service_role" }),
  refresh = new Map();
function identity(u) {
  return {
    id: u.id,
    aud: "authenticated",
    role: "authenticated",
    email: u.email,
    email_confirmed_at: new Date().toISOString(),
    confirmed_at: new Date().toISOString(),
    created_at: "2026-11-01T00:00:00Z",
    updated_at: new Date().toISOString(),
    is_anonymous: false,
    app_metadata: { provider: "email", providers: ["email"] },
    user_metadata: {},
    identities: [],
    factors: [],
  };
}
function session(u) {
  const token = sign({
      role: "authenticated",
      sub: u.id,
      email: u.email,
      aal: u.aal,
      session_id: u.sid,
      aud: "authenticated",
    }),
    r = randomBytes(32).toString("base64url");
  refresh.set(r, u);
  return {
    access_token: token,
    token_type: "bearer",
    expires_in: 86400,
    expires_at: Math.floor(Date.now() / 1000) + 86400,
    refresh_token: r,
    user: identity(u),
  };
}
const sessions = users.map(session);
await writeFile(root + "/sessions.json", JSON.stringify(sessions), {
  mode: 0o600,
});
const front = process.env.E34_REVIEW_FRONT || "http://127.0.0.1:3012";
await writeFile(
  root + "/backend.json",
  JSON.stringify({
    url: front + "/__build-review",
    publishableKey: anon,
    localReview: true,
  }),
  { mode: 0o600 },
);
const binary = resolve("work/build-studio/bin/postgrest");
const postgrest = spawn(binary, [], {
  env: {
    ...process.env,
    DYLD_LIBRARY_PATH: pg.replace(/\/bin$/, "/lib/postgresql"),
    PGRST_DB_URI:
      "postgresql://postgres@/e34_test?host=" + encodeURIComponent(socket),
    PGRST_DB_ANON_ROLE: "anon",
    PGRST_DB_SCHEMAS: "public,storage",
    PGRST_JWT_SECRET: secret,
    PGRST_SERVER_HOST: "127.0.0.1",
    PGRST_SERVER_PORT: String(restPort),
    PGRST_DB_MAX_ROWS: "1000",
  },
  stdio: ["ignore", "ignore", "inherit"],
});
for (let i = 0; i < 40; i++) {
  try {
    const r = await fetch("http://127.0.0.1:" + restPort + "/");
    if (r.ok) break;
  } catch {}
  await new Promise((r) => setTimeout(r, 100));
}
const base = "http://127.0.0.1:" + port,
  options = { auth: { persistSession: false, autoRefreshToken: false } },
  admin = createClient(base, service, options),
  userClient = (token) =>
    createClient(base, anon, {
      ...options,
      global: { headers: { Authorization: "Bearer " + token } },
    });
const origins = [front, "http://127.0.0.1:3012", "http://localhost:3012"];
const server = createServer(async (req, res) => {
  try {
    const path = new URL(req.url, base),
      origin = req.headers.origin;
    if (origin && !origins.includes(origin)) {
      res.writeHead(403);
      res.end();
      return;
    }
    if (origin) res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader(
      "Access-Control-Allow-Headers",
      "authorization,apikey,content-type,x-client-info,prefer,accept-profile,content-profile",
    );
    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET,POST,PATCH,DELETE,OPTIONS",
    );
    res.setHeader("Cache-Control", "no-store");
    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }
    let chunks = [],
      size = 0;
    for await (const chunk of req) {
      size += chunk.length;
      if (size > 2200000) {
        res.writeHead(413);
        res.end();
        return;
      }
      chunks.push(chunk);
    }
    const body = Buffer.concat(chunks),
      token = req.headers.authorization?.replace(/^Bearer\s+/i, ""),
      c = claims(token),
      u = users.find((u) => u.id === c?.sub),
      reply = (status, data) => {
        res.writeHead(status, { "Content-Type": "application/json" });
        res.end(JSON.stringify(data));
      };
    if (path.pathname.startsWith("/rest/v1/")) {
      const headers = { ...req.headers };
      delete headers.host;
      delete headers.origin;
      const result = await fetch(
        "http://127.0.0.1:" + restPort + path.pathname.slice(8) + path.search,
        {
          method: req.method,
          headers,
          body: !["GET", "HEAD"].includes(req.method) ? body : undefined,
        },
      );
      res.writeHead(
        result.status,
        Object.fromEntries(
          [...result.headers].filter(
            ([k]) =>
              ![
                "transfer-encoding",
                "content-encoding",
                "content-length",
              ].includes(k),
          ),
        ),
      );
      res.end(Buffer.from(await result.arrayBuffer()));
      return;
    }
    if (path.pathname === "/auth/v1/token" && req.method === "POST") {
      const data = JSON.parse(body);
      const who =
        path.searchParams.get("grant_type") === "refresh_token"
          ? refresh.get(data.refresh_token)
          : data.password === "review-only"
            ? users.find((u) => u.email === data.email)
            : null;
      if (!who)
        return reply(400, {
          error: "invalid_grant",
          msg: "Use the local review account.",
        });
      sql(
        `insert into auth.sessions(id,user_id,aal)values('${who.sid}','${who.id}','${who.aal}')on conflict(id)do nothing;`,
      );
      return reply(200, session(who));
    }
    if (path.pathname === "/auth/v1/settings")
      return reply(200, { external: { email: true }, disable_signup: true });
    if (path.pathname === "/auth/v1/user")
      return u
        ? reply(200, identity(u))
        : reply(401, { message: "Local review session required" });
    if (path.pathname === "/auth/v1/logout") {
      if (u) sql(`delete from auth.sessions where id='${u.sid}'`);
      res.writeHead(204);
      res.end();
      return;
    }
    if (["/functions/v1/car-media", "/functions/v1/scanner-media"].includes(path.pathname)) {
      const request = new Request(base + path.pathname, {
        method: req.method,
        headers: req.headers,
        body: req.method === "POST" ? body : undefined,
      });
      const handler=path.pathname.endsWith("/scanner-media")?scannerMedia:carMedia;
      const result = await handler(request, {
        admin,
        userClient,
        codec,
        origins,
      });
      res.writeHead(result.status, Object.fromEntries(result.headers));
      res.end(Buffer.from(await result.arrayBuffer()));
      return;
    }
    if (path.pathname.startsWith("/storage/v1/object/")) {
      let rel = path.pathname.slice("/storage/v1/object/".length);
      if (rel.startsWith("authenticated/")) rel = rel.slice(14);
      const [bucket, ...segments] = rel.split("/"),
        name = segments.join("/"),
        safe = /^[0-9a-f-]{36}\/[0-9a-f-]{36}\.jpg$/i;
      if (bucket !== "e34-car-photos")
        return reply(404, { error: "Unknown bucket" });
      if (req.method === "GET" && safe.test(name)) {
        const result = await fetch(
          base +
            "/rest/v1/objects?select=id&bucket_id=eq." +
            bucket +
            "&name=eq." +
            encodeURIComponent(name),
          {
            headers: {
              Authorization: "Bearer " + (token || anon),
              "Accept-Profile": "storage",
            },
          },
        );
        const rows = await result.json();
        if (!result.ok || !Array.isArray(rows) || !rows.length)
          return reply(404, { error: "Photo unavailable" });
        try {
          const bytes = await readFile(root + "/" + name);
          res.writeHead(200, { "Content-Type": "image/jpeg" });
          res.end(bytes);
        } catch {
          reply(404, { error: "Photo unavailable" });
        }
        return;
      }
      if (c?.role !== "service_role")
        return reply(403, { error: "Image processor required" });
      if (req.method === "POST" && safe.test(name)) {
        await mkdir(root + "/" + segments[0], { recursive: true, mode: 0o700 });
        await writeFile(root + "/" + name, body, { flag: "wx", mode: 0o600 });
        const result = await fetch(base + "/rest/v1/objects", {
          method: "POST",
          headers: {
            Authorization: "Bearer " + service,
            "Content-Profile": "storage",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ bucket_id: bucket, name }),
        });
        if (!result.ok)
          return reply(400, { error: "Storage reservation failed" });
        return reply(200, { Key: bucket + "/" + name });
      }
      if (req.method === "DELETE") {
        const names = JSON.parse(body).prefixes;
        if (!Array.isArray(names) || names.some((n) => !safe.test(n)))
          return reply(400, { error: "Invalid cleanup paths" });
        for (const n of names) {
          await unlink(root + "/" + n).catch(() => {});
          await fetch(
            base +
              "/rest/v1/objects?bucket_id=eq." +
              bucket +
              "&name=eq." +
              encodeURIComponent(n),
            {
              method: "DELETE",
              headers: {
                Authorization: "Bearer " + service,
                "Content-Profile": "storage",
              },
            },
          );
        }
        return reply(
          200,
          names.map((name) => ({ name })),
        );
      }
    }
    reply(404, {
      error: "This endpoint is not part of the disposable review fixture.",
    });
  } catch (error) {
    console.error("Local review adapter:", error.message);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Local review request failed" }));
  }
});
server.listen(port, "127.0.0.1", async () => {
  for (let i = 0; i < users.length; i++)
    await fetch(base + "/rest/v1/rpc/claim_username", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + sessions[i].access_token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chosen_username:
          i === 0
            ? "studio_review"
            : i === 1
              ? "studio_other"
              : "studio_moderator",
      }),
    });
  console.log("READY disposable Build Studio review API on loopback " + port);
});
function close() {
  server.close();
  postgrest.kill("SIGTERM");
  setTimeout(() => process.exit(), 250).unref();
}
process.on("SIGTERM", close);
process.on("SIGINT", close);
