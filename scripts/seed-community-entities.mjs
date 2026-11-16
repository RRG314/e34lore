import { writeFileSync } from "node:fs";
import { articles, quickSymptoms } from "../src/data/catalog.ts";
const q = (x) => "'" + String(x).replaceAll("'", "''") + "'";
const insert = (table, rows) =>
  "insert into public." +
  table +
  "(id,title) values\n" +
  rows.map((x) => "(" + q(x.id) + "," + q(x.title) + ")").join(",\n") +
  "\non conflict(id) do update set title=excluded.title;\n";
writeFileSync(
  new URL("../database/community-entity-index.sql", import.meta.url),
  "-- Generated from existing canonical application identities.\n" +
    insert(
      "reference_article_index",
      articles.map((x) => ({ id: x.slug, title: x.title })),
    ) +
    insert("diagnostic_flow_index", quickSymptoms),
);
process.stdout.write(
  JSON.stringify({
    articles: articles.length,
    diagnostics: quickSymptoms.length,
  }) + "\n",
);
