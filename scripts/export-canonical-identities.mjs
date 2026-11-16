import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";
const c = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL,
  publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
};
if (!c.url || !c.publishableKey) {
  throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.");
}
const db = createClient(c.url, c.publishableKey, {
  auth: { persistSession: false },
});
const ids = [];
let cursor = "";
while (true) {
  let query = db.from("parts").select("id").order("id").limit(1000);
  if (cursor) query = query.gt("id", cursor);
  const r = await query;
  if (r.error) throw r.error;
  ids.push(...r.data.map((x) => x.id));
  if (r.data.length < 1000) break;
  cursor = r.data.at(-1).id;
}
fs.mkdirSync("outputs/digital-twin", { recursive: true });
fs.writeFileSync(
  "outputs/digital-twin/canonical-identities.json",
  JSON.stringify(ids),
);
console.log(ids.length + " canonical identities exported.");
