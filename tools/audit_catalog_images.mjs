#!/usr/bin/env node
// Availability only: this does not establish image correctness or publication rights.
import fs from "node:fs/promises";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { createClient } from "@supabase/supabase-js";

const root = path.resolve(import.meta.dirname, "..");
const config = JSON.parse(await fs.readFile(path.join(root, "src/data/backend.json"), "utf8"));
const db = createClient(config.url, config.publishableKey, { auth: { persistSession: false } });
const rows = [];
for (let from = 0; ; from += 1000) {
  const result = await db.from("technical_drawings")
    .select("id,image_path,remote_url").order("id").range(from, from + 999);
  if (result.error) throw result.error;
  rows.push(...result.data);
  if (result.data.length < 1000) break;
}
const assets = [...new Set(rows.map((r) => r.image_path || r.remote_url).filter(Boolean))];
const results = [];
let cursor = 0;
let rateLimited = false;
async function inspect(location) {
  if (location.startsWith("/assets/")) {
    const file = path.resolve(root, "public", "." + location);
    if (!file.startsWith(path.join(root, "public") + path.sep)) return { location, state: "invalid-local-path" };
    try {
      const stat = await fs.stat(file);
      return { location, state: stat.isFile() && stat.size ? "available" : "empty", bytes: stat.size };
    } catch { return { location, state: "missing" }; }
  }
  const url = new URL(location);
  if (url.protocol !== "https:" || url.username || url.password ||
      !["www.bmwpartsdeal.com", "www.realoem.com"].includes(url.hostname))
    return { location, state: "unapproved-host" };
  if (rateLimited) return { location, state: "not-checked-after-rate-limit" };
  try {
    const response = await fetch(location, {
      method: "HEAD", redirect: "error", signal: AbortSignal.timeout(12000),
    });
    if (response.status === 429) rateLimited = true;
    const type = response.headers.get("content-type") || "";
    return { location, status: response.status, type,
      state: response.ok && type.startsWith("image/") ? "available" : "unavailable" };
  } catch (error) { return { location, state: "request-failed", error: error.message }; }
}
async function worker() {
  while (cursor < assets.length) {
    const location = assets[cursor++];
    results.push(await inspect(location));
    if (results.length % 100 === 0) console.log(`Checked ${results.length}/${assets.length} image locations`);
    await delay(250);
  }
}
await Promise.all(Array.from({ length: 3 }, worker));
const counts = Object.fromEntries([...new Set(results.map((r) => r.state))]
  .map((state) => [state, results.filter((r) => r.state === state).length]));
const report = { checked_at: new Date().toISOString(), drawing_records: rows.length,
  distinct_image_locations: assets.length, counts, rate_limited: rateLimited,
  scope: "HTTP availability and local file existence; no artwork downloaded, changed or licensed by this audit.",
  results: results.sort((a, b) => a.location.localeCompare(b.location)) };
const output = path.join(root, ".codex/reports/catalog-images.json");
await fs.mkdir(path.dirname(output), { recursive: true });
await fs.writeFile(output, JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify({ drawing_records: rows.length, distinct_image_locations: assets.length, counts, report: output }));
if (results.some((r) => r.state !== "available")) process.exitCode = 1;
