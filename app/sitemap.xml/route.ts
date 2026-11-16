import { referenceSections } from "../../src/data/quick-reference";
import { manualGuides, manualChapters } from "../../src/data/manual";
import { models, articles } from "../../src/data/catalog";
import { editorials, editorialHref } from "../../src/community/content";
import { repairTopics } from '../../src/repair/library';
export function GET() {
  const origin = "https://e34lore.com";
  const paths = [
    "/",
    "/roadmap",
    "/support",
    "/terms", "/privacy", "/copyright", "/community/specialists",
    "/encyclopedia",
    "/repairs",
    "/parts",
    "/workshop",
    "/builds",
    "/scanner",
    "/app",
    "/parts/catalog",
    "/parts/interchange",
    "/parts/reference",
    "/community",
    "/community/cars",
    "/manual",
    "/quick-reference",
    "/electrical",
    "/community/garages",
    ...referenceSections.map((item) => "/quick-reference/" + item.id),
    "/manual/EWD",
    "/manual/INDEX",
    ...manualChapters.map((c) => "/manual/" + c.id),
    "/community/topics",
    "/community/issues",
    "/community/policies",
    ...editorials.map((e) => editorialHref(e.slug)),
    "/resources",
    "/partnerships",
    ...models.map((m) => "/models/" + encodeURIComponent(m.id)),
    ...articles.map((a) => "/articles/" + a.slug),
    ...manualGuides.map((g) => "/guides/" + g.slug),
    ...repairTopics.map(topic => '/repairs/' + topic.id),
  ];
  return new Response(
    '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
      paths
        .map((path) => "<url><loc>" + origin + path + "</loc></url>")
        .join("") +
      "</urlset>",
    { headers: { "Content-Type": "application/xml; charset=utf-8" } },
  );
}
