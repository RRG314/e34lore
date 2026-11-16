// Read-only checks against the owned production Site or a loopback Worker.
// Never follows a referral, loads an ad, creates an offer or simulates a sale.
import assert from "node:assert/strict";
import hostedBackend from "../src/data/backend.json" with { type: "json" };
const origin = process.env.E34_TEST_ORIGIN || "http://127.0.0.1:3003";
assert.ok(["e34lore.com", "www.e34lore.com", "127.0.0.1", "localhost"].includes(new URL(origin).hostname));
const backend = process.env.E34_TEST_HOSTED_READONLY === "1" ? hostedBackend : {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321",
  publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
};
if (backend !== hostedBackend) {
  assert.ok(["127.0.0.1", "localhost", "[::1]"].includes(new URL(backend.url).hostname),
    "Use a loopback backend unless running the maintainer's hosted read-only checks");
  assert.ok(backend.publishableKey, "Set NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY for the local backend");
}
let checks = 0;
const request = (url, options = {}) => fetch(url, { ...options, signal: AbortSignal.timeout(15000), redirect: "manual" });
async function rpc(name, body = {}) {
  return request(backend.url + "/rest/v1/rpc/" + name, { method: "POST", headers: { apikey: backend.publishableKey, "Content-Type": "application/json" }, body: JSON.stringify(body) });
}
for (const name of ["affiliate_launch_readiness", "affiliate_workspace", "affiliate_link_for_check"]) {
  const response = await rpc(name, name === "affiliate_link_for_check" ? { target_link: "ea340000-0000-4000-8000-000000000999" } : {});
  assert.ok([401, 403].includes(response.status), name + " denies unsigned visitors");
  await response.body?.cancel(); checks++;
}
for (const [name, body] of [["public_affiliate_retailers", {}], ["public_affiliate_offers", { canonical_part_id: "bmw-11511315559", source_position_id: null }]]) {
  const response = await rpc(name, body);
  assert.equal(response.status, 200, name);
  const rows = await response.json();
  assert.ok(Array.isArray(rows) && rows.length <= 20);
  assert.doesNotMatch(JSON.stringify(rows), /"(?:commission|contact_information|secret_reference|public_parameters|approval_evidence_url)"/);
  for (const row of rows) assert.match(row.link_id, /^[a-f0-9-]{36}$/);
  checks++;
}
for (const id of ["invalid", "ea340000-0000-4000-8000-000000000999"]) {
  const response = await request(origin + "/go/" + id + "?url=https://example.org&count=1");
  assert.equal(response.status, 404); assert.equal(response.headers.get("location"), null);
  assert.equal(response.headers.get("cache-control"), "no-store"); checks++;
}
const denied = await request(origin + "/api/affiliate/check", { method: "POST", headers: { "Content-Type": "application/json" }, body: '{"linkId":"ea340000-0000-4000-8000-000000000999"}' });
assert.equal(denied.status, 401); checks++;
for (const path of ["/partnerships", "/parts/catalog?part=bmw-11511315559", "/manage/partners"]) {
  const response = await request(origin + path); assert.equal(response.status, 200, path);
  const html = await response.text();
  assert.doesNotMatch(html, /<script[^>]+src=["'][^"']*(?:adsbygoogle\.js|googlesyndication\.com\/pagead)/i, "No ad-serving script");
  if (path === "/manage/partners") { assert.match(html, /noindex/); assert.doesNotMatch(html, /commission_cents|contact_information/); }
  if (path === "/partnerships") { assert.match(html, /may earn a commission/); assert.match(html, /does not sell/); }
  checks++;
}
const ads = await request(origin + "/ads.txt"); assert.equal(ads.status, 200);
assert.match(await ads.text(), /google\.com, pub-8181130301726385, DIRECT, f08c47fec0942fa0/); checks++;
console.log(`PASS: ${checks} affiliate HTTP checks; no referrals, ads, purchases or authenticated writes triggered.`);
