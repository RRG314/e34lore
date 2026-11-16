import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import { manualGuides } from "../src/data/manual.ts";
import { e30Guides } from "../src/series/e30-repairs.ts";
const guides = [...manualGuides, ...e30Guides];
const revisions = guides.map((g) => ({
  guide: g.slug,
  revision: createHash("sha256")
    .update(JSON.stringify(g))
    .digest("hex")
    .slice(0, 24),
  title: g.title,
  steps: g.steps.map((s) => s.title),
}));
writeFileSync(
  new URL("../src/data/guide-revisions.json", import.meta.url),
  JSON.stringify(revisions, null, 2) + "\n",
);
const q = (x) => "'" + String(x).replaceAll("'", "''") + "'";
writeFileSync(
  new URL("../database/guide-revision-index.sql", import.meta.url),
  "-- Immutable guide/step identities generated from the reviewed application content.\ninsert into public.guide_step_index(guide_id,revision,step_number,title) values\n" +
    revisions
      .flatMap((g) =>
        g.steps.map(
          (s, i) => `(${q(g.guide)},${q(g.revision)},${i + 1},${q(s)})`,
        ),
      )
      .join(",\n") +
    "\non conflict do nothing;\n",
);
writeFileSync(
  new URL("../database/guide-revision-archive.sql", import.meta.url),
  "-- Full original editorial snapshots; draft status is preserved.\ninsert into public.guide_revision_archive(guide_id,revision,content) values\n" +
    guides
      .map(
        (g, i) =>
          `(${q(g.slug)},${q(revisions[i].revision)},${q(JSON.stringify(g))}::jsonb)`,
      )
      .join(",\n") +
    "\non conflict do nothing;\n",
);
console.log(`Registered ${revisions.length} guide revisions`);
