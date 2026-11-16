import assert from "node:assert/strict";
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";
const usingReview = process.env.E34_E2E_REVIEW === "1";
const config = usingReview
  ? JSON.parse(fs.readFileSync(new URL("../work/build-studio/review/backend.json", import.meta.url), "utf8"))
  : {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321",
      publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    };
const backendUrl = new URL(config.url);
assert.ok(["127.0.0.1", "localhost", "[::1]"].includes(backendUrl.hostname),
  "End-to-end tests require a loopback backend");
assert.ok(config.publishableKey, "Set NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY for the local backend");
const origin = process.env.E34_TEST_ORIGIN || "http://127.0.0.1:3000";
if(process.env.E34_E2E_REVIEW === "1"){
  assert.equal(config.localReview,true,"Review mode requires the disposable fixture configuration");
  config.url="http://127.0.0.1:54431";
}
const routes = [
  ["/scanner", "Part Scanner."],
  ["/scanner/credits", "Photo comparison sources."],
  ...(process.env.E34_TEST_LOCAL_FEATURES === "1" ? [
    ["/garage/configuration", "Vehicle configuration"],
    ["/workshop/repair", "M50 coolant-pump service"],
  ] : []),
  ["/manage/scanner", "Review scanner contributions."],
  ["/manage/analytics", "Website analytics"],
  ["/", "Owners’ stories."],
  ["/app", "E34 Lore on your phone."],
  ["/roadmap", "Beyond the E34"],
  // The server renders contact help; the private form opens after its browser challenge.
  ["/support", "Contact &amp; account help."],
  ["/manage/support", "Checking your account"],
  ["/encyclopedia", "Technical reference."],
  ["/repairs", "Repair walkthroughs."],
  ["/repairs?q=replace%20engine%20air%20filter", "Air filter replacement"],
  ["/repairs?q=head%20gasket%20replacement", "M50 and M50TU cylinder head and head gasket removal"],
  ["/repairs?q=change%20oil%20and%20filter", "Oil and filter change"],
  ["/repairs?q=heater%20blower%20only%20works%20on%20high", "Blower resistor or final stage"],
  ["/repairs?q=brake%20pedal%20pulsation", "Start with diagnosis"],
  ["/repairs?track=swap", "Plan an E34 540i six-speed conversion"],
  ["/repairs?track=mod", "Evaluate a fixed-timing M50TU VANOS delete"],
  ["/repairs?q=cabin+air+filter", "HVAC microfilter"],
  ["/repairs?q=head+gasket+replacement", "M50 and M50TU cylinder head and head gasket removal"],
  ["/repairs/512-job-window-regulator-and-motor", "Owner walkthroughs &amp; comments"],
  ["/repairs/340-job-brake-pad-replacement", "Brake pads and discs: illustrated replacement"],
  ["/repairs/240-job-a4s-310r-atf-service", "Printed"],
  ["/repairs?q=automatic+transmission+fluid", "A4S 310R ATF service"],
  ["/guides/m50-water-pump-job-planning", "Extract the old pump squarely"],
  ["/parts/catalog?part=bmw-07129900681", "BMW 07 12 9 900 681"],
  ["/workshop?part=pump-seal", "Explore your E34"],
  ["/workshop?tab=diagrams", "E34 exploded diagrams."],
  ["/workshop?tab=diagrams&context=e34-context-27e34e4ee0bc455bc6555af7&transmission=manual&category=Manual%20Transmission", "E34 exploded diagrams."],
  ["/guides/m50tu-single-vanos-service", "Prove timing by hand before reassembly"],
  ["/guides/e34-525i-five-speed-swap", "Resolve start, reverse and control-unit behavior"],
  ["/guides/m50tu-vanos-delete-planning", "VAC Motorsports single VANOS elimination kit instructions"],
  ["/manual/117", "job-m50tu-vanos-removal-and-installation"],
  ["/parts/catalog?part=bmw-11511315559", "BMW 11 51 1 315 559"],
  ["/guides/factory-halogen-headlight-bulb", "Restore the covers and verify the beam"],
  ["/guides/engine-air-filter-replacement", "Release the perimeter clips"],
  ["/guides/windshield-wiper-blade-replacement", "Verify sweep and park"],
  ["/parts", "OEM number &amp; assembly reference."],
  ["/parts/catalog", "OEM number &amp; assembly reference."],
  ["/parts/reference", "Service figures &amp; 3D references."],
  ["/workshop?part=coolant-pump", "Explore your E34"],
  ["/workshop/assets", "Checking your account"],
  ["/diagnostics", "Symptom diagnosis."],
  ["/community", "The E34 community."],
  ["/community/cars", "Cars and projects."],
  ["/manage", "Owner dashboard."],
  ["/manage/partners", "Affiliates &amp; advertising."],
  ["/manage/security", "Security status"],
  ["/partnerships", "Retailer links &amp; advertising."],
  ["/manual", "Service manual chapters."],
  ["/manual?q=brake+fluid", "Check the brake and clutch fluid reservoir"],
  ["/quick-reference", "Which fuse?"],
  ["/quick-reference/fluids?model=525i-m50", "5.75"],
  ["/quick-reference/fluids?model=525i-m20", "M20 capacity differs"],
  ["/quick-reference/fuses?fuse=23", "Fuel pump and fuel injection"],
  ["/quick-reference/fuses?panel=auxiliary", "Left front of the engine bay"],
  ["/quick-reference/locations?point=battery-rear", "Beneath the rear seat"],
  ["/quick-reference/locations?point=washer-rear", "Behind the right rear trim panel"],
  ["/search?q=fuse%2023", "/quick-reference/fuses?fuse=23"],
  ["/manual/610", "Match the installed fuse and relay arrangement"],
  ["/manual/320", "Steering and wheel alignment"],
  ["/manual/EWD", "Electrical wiring appendix"],
  ["/community/topics", "Topics &amp; repair references."],
  ["/community/issues", "Known issues &amp; manual clarifications."],
  ["/community/topics/cooling-bleed-clarification", "cap-state ambiguity"],
  ["/community/policies", "Community guidelines."],
  ["/community/settings", "Community settings."],
  ["/community/admin", "Community moderation."],
  ["/garages", "Every E34 has a story."],
  ["/shop", "E34 Lore merchandise."],
  ["/marketplace", "Member parts exchange."],
  ["/guides/identify-your-engine", "Engine-family reference photographs"],
  ["/garage", "Checking your garage"],
  ["/account", "Checking your session"],
  ["/resources", "Service literature &amp; sources."],
  ["/guides/cooling-system-visual-check", "Start an overheating investigation"],
  ["/articles/cooling-system", "Cooling system: circulation"],
  ["/models/525i", "BMW 525i"],
  ["/search?q=11517527799", "Search E34 reference."],
];
const rendered = new Map();
const results = [];
for(let start=0;start<routes.length;start+=8)results.push(...await Promise.all(
  routes.slice(start,start+8).map(async ([path, text]) => {
    const r = await fetch(origin + path);
    assert.equal(r.status, 200, path);
    const html = await r.text();
    rendered.set(path, html);
    assert.ok(
      html.includes(text),
      path + " must render its domain content on the server",
    );
    return path + " renders";
  }),
));
assert.ok(rendered.get("/").includes("Show interactive E34 demo") && rendered.get("/").includes("Show 1993 BMW 525i Touring"), "Home connects the 3D demo and real model photographs");
assert.ok(rendered.get("/").includes("Service reference."), "Home presents a service reference");
assert.ok(!rendered.get("/").includes("Repairs. Parts."), "Home does not advertise vehicle parts");
assert.ok(!rendered.get("/manage").includes('href="/manage/security"'), "Anonymous management shell does not advertise the administrator-only security link");
assert.ok(rendered.get("/parts/catalog").includes("does not sell vehicle parts"), "Catalog scope is explicit");
for (const asset of [
  "/assets/e34-520i-daylight-50558383367-original.jpg",
  "/assets/hero/e34-525i-touring-lazurblau-pierre-scheidegger-1920.jpg",
  "/assets/hero/e34-m5-red-classic-days-2022-alexander-migl-1920.jpg",
  "/icons/e34-grille-512.png",
  "/brand/e34-grille.svg",
  "/assets/engines/m50-e34-525i-touring.jpg",
]) {
  const response = await fetch(origin + asset);
  assert.equal(response.status, 200, "Reference image serves: " + asset);
  assert.match(response.headers.get("content-type") || "", /^image\//, asset);
  assert.ok((await response.arrayBuffer()).byteLength > 500, "Reference image has content: " + asset);
}
for (const asset of ["m50-e34-525i-touring.jpg"])
  assert.ok(rendered.get("/").includes(asset), "Home includes a real reference thumbnail: " + asset);
for (const image of ["strut-upper.png","water-pump.png","strut-damper.jpg","brake-disc.png","front-caliper.png"]) {
  assert.equal((await fetch(origin+"/assets/diagrams/"+image)).status,404,"Uncleared OEM image remains source-only: "+image);
  assert.ok(!rendered.get("/").includes("/assets/diagrams/"+image),"Home does not embed an uncleared illustration");
}
assert.ok(rendered.get("/guides/engine-air-filter-replacement").includes("og:title"),
  "Guide has its own share preview metadata");
assert.ok(rendered.get("/parts/catalog?part=bmw-11511315559").includes("og:title"),
  "Exact part-number links have a share preview");
assert.equal((await fetch(origin + "/quick-reference/unknown")).status, 404);
assert.equal((await fetch(origin + "/repairs/not-a-real-job")).status, 404);
for(const path of ['/models/not-a-car','/models/525i/extra','/models/e34-lore/r1001/manifest.unavailable.json'])assert.equal((await fetch(origin+path)).status,404,'Unknown model/asset routes are unavailable: '+path);
assert.equal((await fetch(origin + "/repairs/512-job-window-regulator-and-motor/extra")).status, 404);
for (const path of ['/guides/engine-air-filter-replacement', '/guides/m50-water-pump-job-planning']) {
  assert.ok(!rendered.get(path).includes('steps checked') && !rendered.get(path).includes('Mark step '), 'Guides read as articles without completion counters: ' + path);
  assert.ok(rendered.get(path).includes('Add my walkthrough') && rendered.get(path).includes('Add a comment or question'), 'Each guide links owner write-ups and comments: ' + path);
}
assert.ok(rendered.get("/manual/610").includes("/quick-reference/fuses"));
assert.ok((await (await fetch(origin + "/sitemap.xml")).text()).includes("/quick-reference/locations"));
const adsTxt = await fetch(origin + "/ads.txt");
assert.equal(adsTxt.status, 200);
assert.match(await adsTxt.text(), /google\.com, pub-8181130301726385, DIRECT, f08c47fec0942fa0/);
const missingRetailer = await fetch(origin + "/go/ea340000-0000-4000-8000-000000000999?url=https://example.org", {redirect:"manual"});
assert.equal(missingRetailer.status, 404, "Unregistered retailer IDs cannot redirect");
assert.equal(missingRetailer.headers.get("cache-control"), "no-store");
assert.equal(missingRetailer.headers.get("location"), null);
const deniedCheck = await fetch(origin + "/api/affiliate/check", {method:"POST",headers:{"Content-Type":"application/json"},body:'{"linkId":"ea340000-0000-4000-8000-000000000999"}'});
assert.equal(deniedCheck.status, 401, "Link checks need owner authentication");
assert.match(rendered.get("/manage/partners"), /noindex/);
assert.match(rendered.get("/manage/support"), /noindex/);
assert.match(rendered.get("/workshop/assets"), /noindex/);
assert.equal((await fetch(origin+"/roadmap/unknown")).status,404);
assert.equal((await fetch(origin+"/support/unknown")).status,404);
const supportSitemap=await(await fetch(origin+"/sitemap.xml")).text();
for(const route of ["/roadmap","/support"])assert.ok(supportSitemap.includes("https://e34lore.com"+route),"Public page in sitemap: "+route);
assert.ok(!rendered.get("/").includes("pagead2.googlesyndication.com"), "Verification does not load ad code");
const privateFigures = JSON.parse(fs.readFileSync(new URL("../src/data/manual-figures.json", import.meta.url), "utf8"));
for (const figure of privateFigures) {
  const response = await fetch(origin + figure.image);
  assert.equal(response.status, 404, "Private figure bytes must not be served: " + figure.id);
}
const linksResponse=await fetch(origin+"/.well-known/assetlinks.json",{redirect:"manual"});assert.equal(linksResponse.status,200);const links=await linksResponse.json();assert.equal(links[0].target.package_name,"com.e34lore.app");assert.ok(links[0].target.sha256_cert_fingerprints.includes("A9:39:D8:19:50:E7:72:8A:F9:77:8A:4A:C8:39:37:3F:2E:50:E8:3C:E6:6D:82:66:67:3F:39:E5:38:05:70:F2"));
const manifestResponse=await fetch(origin+"/manifest.webmanifest");assert.equal(manifestResponse.status,200);const manifest=await manifestResponse.json();assert.equal(manifest.name,"E34 Lore");
const sw=await fetch(origin+"/sw.js");assert.equal(sw.status,200);assert.match(await sw.text(),/Never cache HTML navigation/);
const offline=await fetch(origin+"/offline",{redirect:"manual"});assert.equal(offline.status,200);assert.match(await offline.text(),/You’re offline/);
assert.ok(!rendered.get("/repairs?track=swap").includes("Evaluate a fixed-timing M50TU VANOS delete"), "Swap category filters modifications");
assert.ok(!rendered.get("/repairs?track=mod").includes("Plan an E34 540i six-speed conversion"), "Modifications category filters swaps");
const stepIndex=rendered.get("/guides/cooling-system-visual-check");assert.ok(stepIndex.includes("guide_revision=")&&stepIndex.includes("guide_step=1"),"Walkthrough has pinned step discussion links");
const client = createClient(config.url, config.publishableKey, {
  auth: { persistSession: false },
});
for(const table of ["support_tickets","support_messages","support_notes","support_attachments"]){const denied=await client.from(table).select("id");assert.ok(denied.error||denied.data.length===0,"Support correspondence is private: "+table);}
const supportRuntime=await client.rpc("support_service_runtime");assert.ok(supportRuntime.error,"Browser cannot read support runtime credentials");
const commercial = await client.rpc("public_affiliate_offers", {canonical_part_id:"pump-seal"});
assert.ifError(commercial.error);
assert.deepEqual(commercial.data, [], "No unapproved commercial offers");
const privateAds = await client.rpc("public_advertisements", {page_section:"garage"});
assert.ifError(privateAds.error);
assert.deepEqual(privateAds.data, []);
const deniedWorkspace = await client.rpc("affiliate_workspace");
assert.ok(deniedWorkspace.error, "Business workspace is private");
const chapters=await client.from("manual_chapter_index").select("id,title,pdf_start,pdf_end");
assert.ifError(chapters.error);
assert.equal(chapters.data.length,49,"47 source chapters plus two appendices");
for(let start=0;start<chapters.data.length;start+=5){await Promise.all(chapters.data.slice(start,start+5).map(async chapter=>{const response=await fetch(origin+"/manual/"+chapter.id);assert.equal(response.status,200,"Manual chapter "+chapter.id);const html=await response.text();assert.ok(html.includes('SERVICE LITERATURE / '+chapter.id),"Chapter identity renders: "+chapter.id);assert.ok(html.includes('chapter='+chapter.id),"Chapter has a typed question handoff: "+chapter.id);}));}
const editorialRows = await client.from("community_editorials").select("slug");
assert.ifError(editorialRows.error);
assert.equal(
  editorialRows.data.length,
  48,
  "All original starter resources are registered",
);
const topComments = await client.rpc("top_helpful_comments");
assert.ifError(topComments.error);
assert.ok(
  topComments.data.length <= 5,
  "Helpful feature is bounded to five real comments",
);
const noVote = await client.rpc("set_community_feedback", {
  target_post: "00000000-0000-4000-8000-000000000000",
  expected_version: 1,
  feedback_value: "helpful",
});
assert.ok(noVote.error, "Anonymous voting is rejected");
const noStaff = await client.rpc("community_moderation_state");
assert.ok(noStaff.error, "Anonymous staff access is rejected");
const noOwnerDashboard = await client.rpc("owner_dashboard", { search_text: "" });
assert.ok(noOwnerDashboard.error, "Anonymous owner dashboard access is rejected");
assert.ok(!noOwnerDashboard.data, "Anonymous callers receive no dashboard payload");
for (const [table, count] of [
  ["vehicle_models", 12],
  ["parts", 136],
  ["assemblies", 11],
  ["guides", 6],
]) {
  const r = await client
    .from(table)
    .select("id", { count: "exact", head: true });
  assert.ifError(r.error);
  assert.ok(r.count >= count, table + " preserves curated records");
}
const privateRead = await client.from("owned_vehicles").select("id");
assert.ok(
  privateRead.error || privateRead.data.length === 0,
  "Anonymous visitors cannot read garage records",
);
for (const table of ["owner_journal_entries","guide_progress"]) {
 const r=await client.from(table).select("id");assert.ok(r.error||r.data.length===0,"Anonymous private read denied: "+table);
}
const currentGuideRevisions = JSON.parse(
  fs.readFileSync(new URL("../src/data/guide-revisions.json", import.meta.url), "utf8"),
);
const archive = await client.from("guide_revision_archive").select("guide_id,revision");
assert.ifError(archive.error);
const guideSteps = await client.from("guide_step_index").select("guide_id,revision,step_number,title");
assert.ifError(guideSteps.error);
const stepTitles = new Map(guideSteps.data.map((step) => [
  `${step.guide_id}/${step.revision}/${step.step_number}`, step.title,
]));
for (const guide of currentGuideRevisions) {
  assert.ok(
    archive.data.some((row) => row.guide_id === guide.guide && row.revision === guide.revision),
    "Published revision is archived: " + guide.guide,
  );
  guide.steps.forEach((title, index) => {
    const key = `${guide.guide}/${guide.revision}/${index + 1}`;
    assert.equal(stepTitles.get(key), title, "Exact step reference exists: " + key);
  });
}
const pumpArchive = await client.from("guide_revision_archive").select("revision").eq("guide_id", "m50-water-pump-job-planning");
assert.ifError(pumpArchive.error);
assert.ok(pumpArchive.data.some((row) => row.revision === "a0ebe9e0e41c6f2c55976074"), "Original M50 guide revision remains archived");
const interchange = await client.from("part_interchanges").select("target_part_id,relationship,source_position_id").eq("source_part_id", "bmw-07129900681");
assert.ifError(interchange.error);
assert.ok(interchange.data.some((row) => row.target_part_id === "pump-nut" && row.relationship === "conditional" && !!row.source_position_id), "Scoped interchange links its exact position");
const inventory = await client.from("catalog_inventory").select("*");
assert.ifError(inventory.error);
assert.ok(
  inventory.data.some(
    (c) => c.position_count >= 10000 && c.distinct_parts >= 8000,
  ),
  "Owned catalog is loaded",
);
const numberLookup = await client.rpc("catalog_find_parts", {
  search_query: "31 33 1 139 452",
  max_results: 3,
});
assert.ifError(numberLookup.error);
assert.ok(
  numberLookup.data.length > 0,
  "Normalized OEM lookup resolves source positions",
);
const position = numberLookup.data[0];
const art = await client
  .from("technical_drawings")
  .select("remote_url,coordinate_space,hotspots")
  .eq("assembly_id", position.assembly_id);
assert.ifError(art.error);
assert.ok(
  art.data.some(
    (d) =>
      d.remote_url && d.coordinate_space === "percent" && d.hotspots.length,
  ),
  "Source drawing has interactive callouts",
);
const denied = await client
  .from("part_assembly_positions")
  .update({ source_name: "Unauthorized change" })
  .eq("id", position.position_id);
assert.ok(denied.error, "Visitors cannot alter canonical ordering facts");
const unauthorized = await client.from("threads").insert({
  title: "Anonymous write check",
  body: "This must never be published by an anonymous visitor.",
  category: "Technical help",
});
assert.ok(unauthorized.error, "Anonymous contributions must be rejected");
const part = await client
  .from("parts")
  .select("*,assemblies(title),sources(title)")
  .eq("number_normalized", "11517527799")
  .single();
assert.ifError(part.error);
assert.equal(part.data.id, "coolant-pump");
assert.ok(
  part.data.assemblies.title && part.data.sources.title,
  "Part-to-source and assembly links resolve",
);
console.log(
  "PASS:",
  results.length,
  "server-rendered routes; catalog data; anonymous isolation; relational source links.",
);
