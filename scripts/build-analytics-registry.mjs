/** Public editorial identities only. No member/user IDs are exported. */
import fs from "node:fs";
import { siteContent } from "./site-content.mjs";
import { manualGuides, manualChapters } from "../src/data/manual.ts";
import { models, articles, assemblies } from "../src/data/catalog.ts";
import { diagnosticFlows } from "../src/domain/diagnostics.ts";
const referenceSections = [
  ...fs
    .readFileSync("src/data/quick-reference.ts", "utf8")
    .split("export const referenceSections = [")[1]
    .split("] as const")[0]
    .matchAll(/id: "([^"]+)", title: "([^"]+)"/g),
].map((x) => ({ id: x[1], title: x[2] }));
const content = siteContent();
const checking = process.argv.includes("--check");
const registry = "src/analytics/resources.json";
if (!content.release && !checking) throw Error("Updating model resource IDs requires E34_ASSET_PACK.");
const release = JSON.parse(fs.readFileSync("data/digital-twin/public-reference.json", "utf8"));
const nodeResources = content.release
  ? JSON.parse(fs.readFileSync(content.publicDir + release.manifestUrl, "utf8")).nodes.map(x => ({
      id: "node:" + x.id, path: "/workshop", title: x.name || x.id,
      kind: x.kind === "system" ? "system" : "component",
    }))
  : JSON.parse(fs.readFileSync(registry, "utf8")).filter(row => row.id.startsWith("node:"));
const rows = [];
const add = (id, path, title, kind) => rows.push({ id, path, title, kind });
for (const [path, title] of [
  ["/", "Home"],
  ["/search", "Site search"],
  ["/repairs", "Walkthroughs"],
  ["/parts/catalog", "OEM catalog"],
  ["/parts/interchange", "Interchange"],
  ["/scanner", "Component identification"],
  ["/workshop", "Workshop"],
  ["/diagnostics", "Diagnostics"],
  ["/community", "Community"],
  ["/community/cars", "Cars and projects"],
  ["/community/topics", "Community topics"],
  ["/community/issues", "Known issues"],
  ["/garages", "Public garages"],
  ["/builds", "Public builds"],
  ["/manual", "Service manual"],
  ["/resources", "Resources"],
  ["/encyclopedia", "Encyclopedia"],
  ["/app", "Install app"],
  ["/electrical", "Wiring & electrical"],
  ["/quick-reference", "Quick reference"],
  ["/roadmap", "Roadmap"],
  ["/shop", "Merchandise"],
  ["/marketplace", "Exchange"],
])
  add(path, path, title, "page");
for (const [section, title] of [
  ["", "Home"],
  ["/workshop", "Workshop"],
  ["/scanner", "Part Scanner"],
  ["/parts/catalog", "OEM catalog"],
  ["/repairs", "Repair walkthroughs"],
  ["/quick-reference", "Quick reference"],
  ["/electrical", "Wiring & electrical"],
  ["/manual", "Service manual"],
  ["/diagnostics", "Diagnostics"],
  ["/encyclopedia", "Encyclopedia"],
  ["/resources", "Resources"],
  ["/search", "Site search"],
]) {
  const path = "/e30" + section;
  add(path, path, "E30 " + title, "page");
}
for (const x of manualGuides)
  add("/guides/" + x.slug, "/guides/" + x.slug, x.title, "guide");
for (const x of manualChapters)
  add("/manual/" + x.id, "/manual/" + x.id, x.title, "manual");
for (const x of models)
  add("/models/" + x.id, "/models/" + x.id, x.name || x.id, "model");
for (const x of articles)
  add("/articles/" + x.slug, "/articles/" + x.slug, x.title, "article");
for (const x of referenceSections)
  add("/quick-reference/" + x.id, "/quick-reference/" + x.id, x.title, "quick");
for (const x of assemblies)
  add("drawing:" + x.id, "/parts", x.title, "drawing");
rows.push(...nodeResources);
for (const id of Object.keys(diagnosticFlows))
  add("diagnostic:" + id, "/diagnostics", id, "diagnostic");
const unique = [...new Map(rows.map((r) => [r.id, r])).values()].sort((a, b) =>
  a.id.localeCompare(b.id),
);
const json = JSON.stringify(unique, null, 2) + "\n";
if (checking) {
  if (
    fs.readFileSync(registry, "utf8") !== json ||
    fs.readFileSync("supabase/functions/analytics/resources.json", "utf8") !==
      json
  )
    throw Error("Analytics public resource registry is stale.");
} else {
  fs.writeFileSync(registry, json);
  fs.writeFileSync("supabase/functions/analytics/resources.json", json);
  console.log("Registered " + unique.length + " public analytics resources.");
}
