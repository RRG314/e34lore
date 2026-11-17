// Read-only inventory of the owned catalog. Uses the published browser credential.
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";
const config = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL,
  publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
};
if (!config.url || !config.publishableKey) {
  throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.");
}
const db = createClient(config.url, config.publishableKey, {
  auth: { persistSession: false },
});
const queries = await Promise.all([
  db
    .from("catalog_inventory")
    .select("*")
    .order("model_id")
    .order("model_year"),
  db
    .from("parts")
    .select("id", { head: true, count: "exact" })
    .not("number_normalized", "is", null),
  db
    .from("part_assembly_positions")
    .select("id", { head: true, count: "exact" })
    .eq("active", true),
  db
    .from("technical_drawings")
    .select("id", { head: true, count: "exact" })
    .not("remote_url", "is", null),
]);
for (const query of queries) if (query.error) throw query.error;
let images = [];
for (let from = 0; ; from += 1000) {
  const page = await db
    .from("technical_drawings")
    .select("remote_url")
    .not("remote_url", "is", null)
    .order("id")
    .range(from, from + 999);
  if (page.error) throw page.error;
  images.push(...page.data);
  if (page.data.length < 1000) break;
}
const uniqueSourceImages = new Set(images.map((row) => row.remote_url)).size;
const inventory = {
  unique_source_images: uniqueSourceImages,
  observed_at: new Date().toISOString(),
  catalog_subscription_dependency: false,
  registered_bmw_numbers: queries[1].count,
  active_positions: queries[2].count,
  source_drawings: queries[3].count,
  contexts: queries[0].data,
};
fs.writeFileSync(
  new URL("../data/catalog-snapshots/inventory.json", import.meta.url),
  JSON.stringify(inventory, null, 2) + "\n",
);
console.log(
  JSON.stringify({
    registered_bmw_numbers: inventory.registered_bmw_numbers,
    active_positions: inventory.active_positions,
    source_drawings: inventory.source_drawings,
    contexts: inventory.contexts.length,
  }),
);
