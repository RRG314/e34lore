import fs from "node:fs";
import { models, systems, assemblies, parts } from "../src/data/catalog.ts";
import { catalogSources } from "../src/data/catalog-expansion.ts";
import { technicalDrawings } from "../src/data/diagrams.ts";
import { manualSource, manualGuides } from "../src/data/manual.ts";
const q = (v) =>
  v === null || v === undefined
    ? "null"
    : "'" + String(v).replaceAll("'", "''") + "'";
const json = (v) => q(JSON.stringify(v)) + "::jsonb";
const arr = (v) => "array[" + v.map(q).join(",") + "]::text[]";
const sql = [];
for (const m of models)
  sql.push(
    "insert into public.vehicle_models(id,name,engines,coverage) values(" +
      [q(m.id), q("BMW " + m.id), arr(m.engines), q(m.coverage)].join(",") +
      ") on conflict(id) do update set engines=excluded.engines,coverage=excluded.coverage;",
  );
sql.push(
  "insert into public.sources(id,title,publisher,rights,coverage,review_status) values(" +
    [
      q(manualSource.id),
      q(manualSource.title),
      q(manualSource.publisher),
      q(manualSource.rightsStatus),
      json(manualSource),
      q("selected-pages-checked"),
    ].join(",") +
    ") on conflict(id) do update set coverage=excluded.coverage;",
);
sql.push(
  "insert into public.sources(id,title,publisher,url,rights,review_status) values('realoem-11-4931','Waterpump - Thermostat · E34 525i M50','RealOEM'," +
    q(parts[0].source) +
    ",'External catalog reference; no illustration copied','catalog-observed') on conflict(id) do nothing;",
);
for (const source of catalogSources)
  sql.push(
    "insert into public.sources(id,title,publisher,url,rights,review_status) values(" +
      [
        q(source.id),
        q(source.title),
        q(source.publisher),
        q(source.url),
        q(
          "Catalog identities observed; illustration excerpts restricted to owner-private review pending publication rights",
        ),
        q("catalog-observed"),
      ].join(",") +
      ") on conflict(id) do update set title=excluded.title,url=excluded.url;",
  );
const sourceForPart = (part) =>
  part.sourceId ||
  (part.source.startsWith("https") ? "realoem-11-4931" : manualSource.id);
const sourceForDrawing = (drawing) =>
  catalogSources.find((source) => source.url === drawing?.source)?.id ||
  manualSource.id;
for (const s of systems)
  sql.push(
    "insert into public.components(id,name,system_id) values(" +
      [q(s.id), q(s.name), q(s.id)].join(",") +
      ") on conflict(id) do nothing;",
  );
for (const a of assemblies)
  sql.push(
    "insert into public.assemblies(id,component_id,title,source_id,source_locator,boundary) values(" +
      [
        q(a.id),
        q(a.system),
        q(a.title),
        q(
          a.id === "water-pump"
            ? "realoem-11-4931"
            : sourceForDrawing(
                technicalDrawings.find((d) => d.assembly === a.id),
              ),
        ),
        q(a.source),
        q(a.boundary),
      ].join(",") +
      ") on conflict(id) do update set title=excluded.title,source_id=excluded.source_id,source_locator=excluded.source_locator,boundary=excluded.boundary;",
  );
for (const p of parts) {
  const source = sourceForPart(p);
  sql.push(
    "insert into public.parts(id,assembly_id,name,number_normalized,source_id,source_locator,review_status,detail) values(" +
      [
        q(p.id),
        q(p.assembly),
        q(p.name),
        q(p.number),
        q(source),
        q(p.sourceLabel),
        q(p.review),
        json(p),
      ].join(",") +
      ") on conflict(id) do update set assembly_id=excluded.assembly_id,name=excluded.name,number_normalized=excluded.number_normalized,source_id=excluded.source_id,source_locator=excluded.source_locator,review_status=excluded.review_status,detail=excluded.detail||case when public.parts.detail ? 'archive_evidence' then jsonb_build_object('archive_evidence',public.parts.detail->'archive_evidence') else '{}'::jsonb end;",
  );
  if (p.review === "catalog-listed")
    for (const engine of p.engines.length ? p.engines : [null]) {
      const endDate = p.to
        ? new Date(
            Date.UTC(Number(p.to.slice(0, 4)), Number(p.to.slice(5, 7)), 0),
          )
            .toISOString()
            .slice(0, 10)
        : null;
      sql.push(
        "insert into public.part_fitments(part_id,model_id,engine,market,body,production_from,production_to,status,source_id,conditions) select " +
          [
            q(p.id),
            q(p.model),
            q(engine),
            q(p.market),
            q(p.body),
            q(p.from ? p.from + "-01" : null),
            q(endDate),
            q("conditional"),
            q(source),
            q(p.note),
          ].join(",") +
          " where not exists(select 1 from public.part_fitments where part_id=" +
          q(p.id) +
          " and engine is not distinct from " +
          q(engine) +
          " and source_id=" +
          q(source) +
          ");",
      );
    }
}
for (const drawing of technicalDrawings)
  sql.push(
    "insert into public.technical_drawings(id,assembly_id,source_id,image_path,pixel_width,pixel_height,credit,applicability,rights_status,hotspots) values(" +
      [
        q(drawing.id),
        q(drawing.assembly),
        q(sourceForDrawing(drawing)),
        q(drawing.image),
        drawing.width,
        drawing.height,
        q(drawing.credit),
        q(drawing.scope),
        q("private-review-only"),
        json(drawing.hotspots),
      ].join(",") +
      ") on conflict(id) do update set image_path=excluded.image_path,pixel_width=excluded.pixel_width,pixel_height=excluded.pixel_height,hotspots=excluded.hotspots,credit=excluded.credit,applicability=excluded.applicability;",
  );
for (const g of manualGuides)
  sql.push(
    "insert into public.guides(id,component_id,title,source_id,source_locator,engines,review_status,content) values(" +
      [
        q(g.slug),
        q(g.system),
        q(g.title),
        q(g.source.id),
        q(g.source.section + "; PDF " + g.source.pdfPages.join(",")),
        arr(g.engines),
        q(g.reviewStatus),
        json(g),
      ].join(",") +
      ") on conflict(id) do update set content=excluded.content;",
  );
fs.writeFileSync("database/seed.sql", sql.join("\n") + "\n");
console.log(
  "Generated catalog seed:",
  models.length,
  "model families,",
  parts.length,
  "components,",
  manualGuides.length,
  "guides.",
);
